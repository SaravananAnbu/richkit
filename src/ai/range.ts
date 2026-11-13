import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension, type Editor } from "@tiptap/react";

export interface AIRange {
  from: number;
  to: number;
}

const key = new PluginKey<AIRange | null>("richkitAIRange");

/**
 * Remembers the range the AI panel is working on and keeps it visibly marked
 * while focus is in the panel (the browser hides the native selection then).
 * The range follows any edits made in the meantime.
 */
export const AIRangeExtension = Extension.create({
  name: "richkitAIRange",

  addProseMirrorPlugins() {
    return [
      new Plugin<AIRange | null>({
        key,
        state: {
          init: () => null,
          apply(tr, value) {
            const next = tr.getMeta(key) as AIRange | null | undefined;
            if (next !== undefined) return next;
            if (!value || !tr.docChanged) return value;
            const from = tr.mapping.map(value.from, 1);
            return { from, to: Math.max(from, tr.mapping.map(value.to, -1)) };
          },
        },
        props: {
          decorations(state) {
            const range = key.getState(state);
            if (!range) return null;
            const decoration =
              range.from === range.to
                ? Decoration.widget(range.from, () => {
                    const caret = document.createElement("span");
                    caret.className = "richkit-ai-caret";
                    return caret;
                  })
                : Decoration.inline(range.from, range.to, { class: "richkit-ai-range" });
            return DecorationSet.create(state.doc, [decoration]);
          },
        },
      }),
    ];
  },
});

export function getAIRange(editor: Editor): AIRange | null {
  return key.getState(editor.state) ?? null;
}

export function setAIRange(editor: Editor, range: AIRange | null): void {
  if (editor.isDestroyed) return;
  editor.view.dispatch(editor.state.tr.setMeta(key, range).setMeta("addToHistory", false));
}
