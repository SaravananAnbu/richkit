// Server-safe entry: no React, no editor, and no "use client" marker, so it can be
// imported from a Next.js route handler, a server action or any Node backend.
export { AI_SYSTEM_PROMPT, buildAIPrompt } from "./ai/prompts";
export type { AIAction, AIRequest } from "./ai/types";
