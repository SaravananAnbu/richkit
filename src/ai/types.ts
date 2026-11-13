export type AIAction =
  | "improve"
  | "fixGrammar"
  | "shorten"
  | "expand"
  | "simplify"
  | "professional"
  | "casual"
  | "translate"
  | "continue"
  | "summarize"
  /** Free-form instruction typed by the writer (see `prompt`). */
  | "custom";

export interface AIRequest {
  action: AIAction;
  /** The writer's instruction for `custom`, or the target language for `translate`. */
  prompt?: string;
  /** Selected content as HTML. Empty when nothing is selected. */
  selection: string;
  /** Plain text of the whole document, for context. */
  document: string;
  /** Aborted when the writer presses Stop or closes the panel. */
  signal: AbortSignal;
}

/** Anything a custom backend can reasonably hand back; all of it is streamed into the preview. */
export type AIResult = string | AsyncIterable<string> | ReadableStream<Uint8Array | string> | Response;

/**
 * Bring your own backend. Return the model's answer as an HTML fragment
 * (use `buildAIPrompt` to get the same prompts the built-in providers send).
 */
export type AIComplete = (request: AIRequest) => AIResult | Promise<AIResult>;

interface AIKeyConfig {
  /**
   * The API key. It is sent from the browser straight to the provider, so only
   * pass a key that belongs to the person using the page. For a key that belongs
   * to your app, keep it on your server and use `complete` instead.
   */
  apiKey: string;
  /** Override the API origin, for example to go through your own proxy. */
  baseURL?: string;
}

export type AIProviderConfig =
  | (AIKeyConfig & { provider: "claude"; /** Defaults to `claude-opus-5-5`. */ model?: string })
  | (AIKeyConfig & { provider: "openai"; model: string })
  | (AIKeyConfig & { provider: "gemini"; model: string });

export type AIConfig = AIProviderConfig | { complete: AIComplete };
