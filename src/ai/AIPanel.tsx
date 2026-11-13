import { getHTMLFromFragment, type Editor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { icons } from "../icons";
import { runAI } from "./providers";
import { getAIRange, setAIRange, type AIRange } from "./range";
import { sanitizeAIOutput } from "./sanitize";
import type { AIAction, AIConfig } from "./types";

const SELECTION_ACTIONS: [AIAction, string][] = [
  ["improve", "Improve writing"],
  ["fixGrammar", "Fix grammar"],
  ["shorten", "Shorten"],
  ["expand", "Expand"],
  ["simplify", "Simplify"],
  ["professional", "Professional"],
  ["casual", "Casual"],
];

const CURSOR_ACTIONS: [AIAction, string][] = [
  ["continue", "Continue writing"],
  ["summarize", "Summarise document"],
];

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Hindi",
  "Tamil",
  "Arabic",
  "Chinese",
  "Japanese",
  "Korean",
];

type Status = "idle" | "running" | "done" | "error";

interface Job {
  action: AIAction;
  prompt?: string;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** Plain text of the document, with a marker at the cursor when nothing is selected. */
function documentText(editor: Editor, range: AIRange): string {
  const { doc } = editor.state;
  if (range.from !== range.to) return doc.textBetween(0, doc.content.size, "\n\n");
  return `${doc.textBetween(0, range.from, "\n\n")}<cursor/>${doc.textBetween(range.from, doc.content.size, "\n\n")}`;
}

export function AIPanel({ editor, config, onClose }: { editor: Editor; config: AIConfig; onClose: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [hasSelection, setHasSelection] = useState(() => !editor.state.selection.empty);

  const inputRef = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const lastJob = useRef<Job | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  // Pin the range the writer had selected when the panel opened, and release it on close.
  useEffect(() => {
    const { from, to } = editor.state.selection;
    setAIRange(editor, { from, to });
    setHasSelection(from !== to);
    inputRef.current?.focus();
    return () => {
      controller.current?.abort();
      setAIRange(editor, null);
    };
  }, [editor]);

  const preview = useMemo(() => sanitizeAIOutput(editor, output), [editor, output]);

  const run = async (job: Job) => {
    const range = getAIRange(editor);
    if (!range) return;

    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    lastJob.current = job;
    setStatus("running");
    setOutput("");
    setError("");

    let text = "";
    try {
      const { doc, schema } = editor.state;
      const selection = range.from === range.to ? "" : getHTMLFromFragment(doc.slice(range.from, range.to).content, schema);
      const chunks = runAI(configRef.current, {
        action: job.action,
        prompt: job.prompt,
        selection,
        document: documentText(editor, range),
        signal: abort.signal,
      });
      for await (const chunk of chunks) {
        if (abort.signal.aborted) break;
        text += chunk;
        setOutput(text);
      }
      if (abort.signal.aborted) return;
      if (!sanitizeAIOutput(editor, text)) throw new Error("The model returned nothing to insert. Try again.");
      setStatus("done");
    } catch (cause) {
      if (controller.current !== abort) return; // superseded by a newer run
      if (isAbort(cause) || abort.signal.aborted) {
        // Stopped by the writer: keep whatever arrived so they can still use it.
        setStatus(text.trim() ? "done" : "idle");
        return;
      }
      setError(cause instanceof Error ? cause.message : "The AI request failed.");
      setStatus("error");
    }
  };

  const stop = () => {
    controller.current?.abort();
    setStatus(output.trim() ? "done" : "idle");
  };

  const discard = () => {
    controller.current?.abort();
    setOutput("");
    setError("");
    setStatus("idle");
    inputRef.current?.focus();
  };

  /** One transaction, so a single undo reverts the whole AI edit. */
  const accept = (mode: "replace" | "below") => {
    const range = getAIRange(editor);
    if (!range || !preview) return;
    const at =
      mode === "replace"
        ? range
        : // After the top-level block that the selection ends in.
          Math.min(editor.state.doc.resolve(range.to).after(1), editor.state.doc.content.size);
    onClose();
    editor.chain().focus().insertContentAt(at, preview).run();
  };

  const submit = () => {
    const text = prompt.trim();
    if (text && status !== "running") void run({ action: "custom", prompt: text });
  };

  const showChips = status === "idle";
  const chips = hasSelection ? SELECTION_ACTIONS : CURSOR_ACTIONS;

  return (
    <div
      className="richkit-ai"
      role="region"
      aria-label="AI assistant"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
          editor.commands.focus();
        }
      }}
    >
      <div className="richkit-ai-bar">
        <span className="richkit-ai-mark">{icons.sparkle}</span>
        <input
          ref={inputRef}
          className="richkit-ai-input"
          type="text"
          aria-label="Ask AI"
          placeholder={hasSelection ? "Tell AI how to change the selection…" : "Ask AI to write something…"}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        {status === "running" ? (
          <button type="button" className="richkit-action" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="button" className="richkit-action" data-primary="" disabled={!prompt.trim()} onClick={submit}>
            Ask
          </button>
        )}
        <button
          type="button"
          className="richkit-btn"
          aria-label="Close AI"
          onClick={() => {
            onClose();
            editor.commands.focus();
          }}
        >
          {icons.close}
        </button>
      </div>

      {showChips && (
        <div className="richkit-ai-chips">
          <span className="richkit-ai-scope">{hasSelection ? "Selection:" : "At cursor:"}</span>
          {chips.map(([action, label]) => (
            <button key={action} type="button" className="richkit-chip" onClick={() => void run({ action })}>
              {label}
            </button>
          ))}
          {hasSelection && (
            <select
              className="richkit-chip"
              aria-label="Translate selection"
              value=""
              onChange={(e) => {
                if (e.target.value) void run({ action: "translate", prompt: e.target.value });
              }}
            >
              <option value="">Translate…</option>
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {status === "running" && !preview && (
        <p className="richkit-ai-note" role="status">
          Thinking…
        </p>
      )}

      {preview && (
        <div
          className="richkit-ai-preview richkit-content"
          aria-label="AI suggestion"
          aria-busy={status === "running"}
          // Safe: `preview` has been stripped and round-tripped through the editor schema.
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      )}

      {status === "error" && (
        <p className="richkit-ai-note" data-error="" role="alert">
          {error}
        </p>
      )}

      {(status === "done" || status === "error") && (
        <div className="richkit-ai-actions">
          {status === "done" && (
            <>
              <button type="button" className="richkit-action" data-primary="" onClick={() => accept("replace")}>
                {hasSelection ? "Replace selection" : "Insert"}
              </button>
              {hasSelection && (
                <button type="button" className="richkit-action" onClick={() => accept("below")}>
                  Insert below
                </button>
              )}
            </>
          )}
          {lastJob.current && (
            <button type="button" className="richkit-action" onClick={() => void run(lastJob.current!)}>
              Try again
            </button>
          )}
          <button type="button" className="richkit-action" onClick={discard}>
            Discard
          </button>
        </div>
      )}
    </div>
  );
}
