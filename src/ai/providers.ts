import { buildAIPrompt } from "./prompts";
import type { AIConfig, AIProviderConfig, AIRequest, AIResult } from "./types";

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";

const PROVIDER_NAMES = { claude: "Claude", openai: "OpenAI", gemini: "Gemini" } as const;

/** Yields the `data:` payload of each Server-Sent Event in a response body. */
async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = done ? "" : (lines.pop() ?? "");
      for (const line of lines) {
        if (line.startsWith("data:")) yield line.slice(5).trim();
      }
      if (done) return;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

/** Turns a failed response into an error whose message is safe to show the writer. */
async function apiError(provider: keyof typeof PROVIDER_NAMES, response: Response): Promise<Error> {
  let detail = "";
  try {
    const text = await response.text();
    try {
      const json = JSON.parse(text) as { error?: { message?: string } | string } | [{ error?: { message?: string } }];
      const error = Array.isArray(json) ? json[0]?.error : json.error;
      detail = typeof error === "string" ? error : (error?.message ?? "");
    } catch {
      detail = text.slice(0, 200);
    }
  } catch {
    // No readable body; the status alone will have to do.
  }
  const hint =
    response.status === 401 || response.status === 403
      ? "Check the API key."
      : response.status === 429
        ? "Rate limited or out of credit. Try again shortly."
        : "";
  return new Error([`${PROVIDER_NAMES[provider]} request failed (${response.status}).`, detail, hint].filter(Boolean).join(" "));
}

async function post(
  provider: keyof typeof PROVIDER_NAMES,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw await apiError(provider, response);
  if (!response.body) throw new Error(`${PROVIDER_NAMES[provider]} returned an empty response.`);
  return response.body;
}

function parse<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

async function* streamClaude(config: AIProviderConfig & { provider: "claude" }, request: AIRequest) {
  const { system, user } = buildAIPrompt(request);
  const model = config.model ?? DEFAULT_CLAUDE_MODEL;
  // On the default model, let the API re-run a request its safety classifiers
  // decline on a fallback model. Other models may not accept the parameter.
  const withFallback = model === DEFAULT_CLAUDE_MODEL;

  const body = await post(
    "claude",
    `${config.baseURL ?? "https://api.anthropic.com"}/v1/messages`,
    {
      "x-api-key": config.apiKey,
      "anthropic-version": "2026-10-21",
      // Required for calls made directly from a browser with the user's own key.
      "anthropic-dangerous-direct-browser-access": "true",
      ...(withFallback ? { "anthropic-beta": "server-side-fallback-2026-07-01" } : {}),
    },
    {
      model,
      max_tokens: 64000,
      stream: true,
      system,
      messages: [{ role: "user", content: user }],
      ...(withFallback ? { fallbacks: "default" } : {}),
    },
    request.signal,
  );

  type Event = {
    type?: string;
    delta?: { type?: string; text?: string; stop_reason?: string };
    error?: { message?: string };
  };
  for await (const data of sseData(body)) {
    const event = parse<Event>(data);
    if (!event) continue;
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
      yield event.delta.text;
    } else if (event.type === "message_delta" && event.delta?.stop_reason === "refusal") {
      throw new Error("Claude declined this request.");
    } else if (event.type === "message_delta" && event.delta?.stop_reason === "max_tokens") {
      throw new Error("The reply was cut off because it reached the length limit.");
    } else if (event.type === "error") {
      throw new Error(`Claude request failed. ${event.error?.message ?? ""}`.trim());
    }
  }
}

async function* streamOpenAI(config: AIProviderConfig & { provider: "openai" }, request: AIRequest) {
  const { system, user } = buildAIPrompt(request);
  const body = await post(
    "openai",
    `${config.baseURL ?? "https://api.openai.com"}/v1/chat/completions`,
    { authorization: `Bearer ${config.apiKey}` },
    {
      model: config.model,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    request.signal,
  );

  type Chunk = { choices?: { delta?: { content?: string | null } }[]; error?: { message?: string } };
  for await (const data of sseData(body)) {
    if (data === "[DONE]") return;
    const chunk = parse<Chunk>(data);
    if (chunk?.error) throw new Error(`OpenAI request failed. ${chunk.error.message ?? ""}`.trim());
    const text = chunk?.choices?.[0]?.delta?.content;
    if (text) yield text;
  }
}

async function* streamGemini(config: AIProviderConfig & { provider: "gemini" }, request: AIRequest) {
  const { system, user } = buildAIPrompt(request);
  const origin = config.baseURL ?? "https://generativelanguage.googleapis.com";
  const body = await post(
    "gemini",
    `${origin}/v1beta/models/${encodeURIComponent(config.model)}:streamGenerateContent?alt=sse`,
    // Header, not a query parameter, so the key stays out of URLs and logs.
    { "x-goog-api-key": config.apiKey },
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
    },
    request.signal,
  );

  type Chunk = {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
    error?: { message?: string };
  };
  for await (const data of sseData(body)) {
    const chunk = parse<Chunk>(data);
    if (!chunk) continue;
    if (chunk.error) throw new Error(`Gemini request failed. ${chunk.error.message ?? ""}`.trim());
    if (chunk.promptFeedback?.blockReason) throw new Error("Gemini declined this request.");
    const candidate = chunk.candidates?.[0];
    for (const part of candidate?.content?.parts ?? []) {
      if (part.text && !part.thought) yield part.text;
    }
    if (candidate?.finishReason === "SAFETY") throw new Error("Gemini declined this request.");
  }
}

/** Normalises whatever a custom `complete` function returned into text chunks. */
async function* toChunks(result: AIResult): AsyncGenerator<string> {
  if (typeof result === "string") {
    yield result;
    return;
  }
  if (typeof Response !== "undefined" && result instanceof Response) {
    if (!result.ok) throw new Error(`AI request failed (${result.status}).`);
    if (!result.body) return;
    result = result.body;
  }
  if (typeof ReadableStream !== "undefined" && result instanceof ReadableStream) {
    const reader = result.getReader();
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = typeof value === "string" ? value : decoder.decode(value, { stream: true });
        if (text) yield text;
      }
      const rest = decoder.decode();
      if (rest) yield rest;
    } finally {
      reader.cancel().catch(() => {});
    }
    return;
  }
  yield* result as AsyncIterable<string>;
}

/** Runs one AI request against the configured provider or custom backend, yielding text as it arrives. */
export async function* runAI(config: AIConfig, request: AIRequest): AsyncGenerator<string> {
  if ("complete" in config) {
    yield* toChunks(await config.complete(request));
    return;
  }
  if (!config.apiKey) throw new Error("No API key provided.");
  switch (config.provider) {
    case "claude":
      yield* streamClaude(config, request);
      return;
    case "openai":
      yield* streamOpenAI(config, request);
      return;
    case "gemini":
      yield* streamGemini(config, request);
      return;
  }
}
