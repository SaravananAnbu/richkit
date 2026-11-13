import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RichTextEditor, type RichTextEditorRef } from "../src";
import { normalizeUrl } from "../src/Toolbar";

afterEach(cleanup);

async function mount(ui: React.ReactElement) {
  const result = render(ui);
  await waitFor(() => expect(result.container.querySelector(".richkit-content")).not.toBeNull());
  return result;
}

describe("RichTextEditor", () => {
  it("renders initial content and the default toolbar", async () => {
    const { container } = await mount(<RichTextEditor defaultValue="<p>Hello <strong>world</strong></p>" />);
    expect(container.querySelector(".richkit-content")?.innerHTML).toContain("<strong>world</strong>");
    expect(screen.getByRole("toolbar")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bold" })).toBeTruthy();
  });

  it("hides the toolbar when toolbar={false}", async () => {
    await mount(<RichTextEditor toolbar={false} />);
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("renders only the requested toolbar items", async () => {
    await mount(<RichTextEditor toolbar={["bold", "|", "italic"]} />);
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Bold", "Italic"]);
  });

  it("calls onChange with HTML, and with an empty string when cleared", async () => {
    const onChange = vi.fn();
    const ref = createRef<RichTextEditorRef>();
    await mount(<RichTextEditor ref={ref} defaultValue="<p>Hi</p>" onChange={onChange} />);

    act(() => void ref.current!.editor!.commands.setContent("<p>Changed</p>", { emitUpdate: true }));
    expect(onChange.mock.lastCall?.[0]).toBe("<p>Changed</p>");

    act(() => ref.current!.clear());
    expect(onChange.mock.lastCall?.[0]).toBe("");
    expect(ref.current!.getHTML()).toBe("");
  });

  it("syncs a controlled value without echoing onChange", async () => {
    const onChange = vi.fn();
    const ref = createRef<RichTextEditorRef>();
    const { rerender } = await mount(<RichTextEditor ref={ref} value="<p>One</p>" onChange={onChange} />);
    rerender(<RichTextEditor ref={ref} value="<p>Two</p>" onChange={onChange} />);
    await waitFor(() => expect(ref.current!.getHTML()).toBe("<p>Two</p>"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies formatting from the toolbar", async () => {
    const ref = createRef<RichTextEditorRef>();
    await mount(<RichTextEditor ref={ref} defaultValue="<p>Hello</p>" />);
    act(() => void ref.current!.editor!.commands.selectAll());
    act(() => screen.getByRole("button", { name: "Bold" }).click());
    expect(ref.current!.getHTML()).toBe("<p><strong>Hello</strong></p>");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Bold" }).getAttribute("aria-pressed")).toBe("true"),
    );
  });

  it("becomes read-only when editable is false", async () => {
    const ref = createRef<RichTextEditorRef>();
    const { container } = await mount(<RichTextEditor ref={ref} editable={false} />);
    expect(container.querySelector(".richkit-content")?.getAttribute("contenteditable")).toBe("false");
    expect((screen.getByRole("button", { name: "Bold" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("applies colour, highlight, alignment and task lists", async () => {
    const ref = createRef<RichTextEditorRef>();
    await mount(<RichTextEditor ref={ref} defaultValue="<p>Hello</p>" />);
    const editor = ref.current!.editor!;
    act(() => void editor.commands.selectAll());

    act(() => screen.getByRole("button", { name: "Text colour" }).click());
    act(() => screen.getByRole("button", { name: "Red" }).click());
    expect(ref.current!.getHTML()).toContain("color: rgb(220, 38, 38)");

    act(() => screen.getByRole("button", { name: "Highlight" }).click());
    act(() => screen.getByRole("button", { name: "Yellow" }).click());
    expect(ref.current!.getHTML()).toContain("<mark");

    act(() => screen.getByRole("button", { name: "Align" }).click());
    act(() => screen.getByRole("button", { name: "Align centre" }).click());
    expect(ref.current!.getHTML()).toContain("text-align: center");

    act(() => screen.getByRole("button", { name: "Task list" }).click());
    expect(ref.current!.getHTML()).toContain('data-type="taskList"');
  });

  it("changes the block type from the text style menu", async () => {
    const ref = createRef<RichTextEditorRef>();
    await mount(<RichTextEditor ref={ref} defaultValue="<p>Title</p>" />);
    act(() => screen.getByRole("button", { name: "Text style" }).click());
    act(() => screen.getByText("Heading 2").click());
    expect(ref.current!.getHTML()).toContain("<h2>Title</h2>");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("inserts a table from the grid picker and offers row actions inside it", async () => {
    const ref = createRef<RichTextEditorRef>();
    await mount(<RichTextEditor ref={ref} />);
    act(() => screen.getByRole("button", { name: "Table" }).click());
    act(() => screen.getByRole("button", { name: "Insert 2 by 3 table" }).click());
    const html = ref.current!.getHTML();
    expect(html.match(/<tr>/g)).toHaveLength(2);
    expect(html.match(/<th[ >]/g)).toHaveLength(3);

    act(() => screen.getByRole("button", { name: "Table" }).click());
    act(() => screen.getByText("Insert row below").click());
    expect(ref.current!.getHTML().match(/<tr>/g)).toHaveLength(3);
  });

  it("uploads images through onImageUpload", async () => {
    const ref = createRef<RichTextEditorRef>();
    const onImageUpload = vi.fn(async (file: File) => `https://cdn.test/${file.name}`);
    const { container } = await mount(<RichTextEditor ref={ref} onImageUpload={onImageUpload} />);
    act(() => screen.getByRole("button", { name: "Image" }).click());
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["x"], "cat.png", { type: "image/png" });
    Object.defineProperty(input, "files", { value: [file] });
    act(() => void input.dispatchEvent(new Event("change", { bubbles: true })));
    await waitFor(() => expect(ref.current!.getHTML()).toContain('src="https://cdn.test/cat.png"'));
    expect(onImageUpload).toHaveBeenCalledWith(file);
  });

  it("hides upload when no onImageUpload is given", async () => {
    const { container } = await mount(<RichTextEditor />);
    act(() => screen.getByRole("button", { name: "Image" }).click());
    expect(screen.getByLabelText("Image URL")).toBeTruthy();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("shows a counter and enforces maxLength", async () => {
    const ref = createRef<RichTextEditorRef>();
    const { container } = await mount(<RichTextEditor ref={ref} maxLength={10} defaultValue="<p>Hello</p>" />);
    expect(container.querySelector(".richkit-count")?.textContent).toBe("1 word · 5 / 10 characters");
    act(() => void ref.current!.editor!.commands.insertContentAt(6, " wonderful world"));
    expect(ref.current!.getText().length).toBeLessThanOrEqual(10);
  });

  it("toggles fullscreen", async () => {
    const { container } = await mount(<RichTextEditor />);
    act(() => screen.getByRole("button", { name: "Fullscreen" }).click());
    expect(container.querySelector(".richkit")?.hasAttribute("data-fullscreen")).toBe(true);
    act(() => screen.getByRole("button", { name: "Exit fullscreen" }).click());
    expect(container.querySelector(".richkit")?.hasAttribute("data-fullscreen")).toBe(false);
  });

  it("renders on the server without touching the DOM", () => {
    const html = renderToString(<RichTextEditor defaultValue="<p>SSR</p>" theme="dark" />);
    expect(html).toContain('class="richkit"');
    expect(html).toContain('data-theme="dark"');
  });
});

describe("normalizeUrl", () => {
  it("adds https:// to bare domains only", () => {
    expect(normalizeUrl(" example.com ")).toBe("https://example.com");
    expect(normalizeUrl("http://a.b")).toBe("http://a.b");
    expect(normalizeUrl("mailto:a@b.c")).toBe("mailto:a@b.c");
    expect(normalizeUrl("/docs")).toBe("/docs");
    expect(normalizeUrl("")).toBe("");
  });
});
