import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { icons } from "./icons";
import { ToolbarButton } from "./Popover";
import { readMarks, RUN } from "./Toolbar";

const MARKS = [
  ["bold", "Bold"],
  ["italic", "Italic"],
  ["underline", "Underline"],
  ["strike", "Strikethrough"],
  ["code", "Inline code"],
] as const;

/** Floating format bar shown above a text selection. Client-only. */
export function BubbleBar(props: { editor: Editor; appendTo: () => HTMLElement; onAskAI?: () => void }) {
  const { editor, appendTo } = props;
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({ ...readMarks(e), highlight: e.isActive("highlight") }),
  });

  return (
    <BubbleMenu
      editor={editor}
      appendTo={appendTo}
      className="richkit-bubble"
      options={{ placement: "top", offset: 8 }}
      shouldShow={({ editor: e, state: s, from, to }) =>
        e.isEditable &&
        e.isFocused &&
        !s.selection.empty &&
        !("$anchorCell" in s.selection) &&
        !e.isActive("codeBlock") &&
        !e.isActive("image") &&
        s.doc.textBetween(from, to).trim().length > 0
      }
    >
      {props.onAskAI && (
        <>
          <ToolbarButton wide label="Ask AI" onClick={props.onAskAI}>
            {icons.sparkle}
            <span className="richkit-btn-text">AI</span>
          </ToolbarButton>
          <span className="richkit-sep" role="separator" aria-orientation="vertical" />
        </>
      )}
      {MARKS.map(([name, label]) => (
        <ToolbarButton key={name} label={label} active={state[name]} onClick={() => RUN[name](editor)}>
          {icons[name]}
        </ToolbarButton>
      ))}
      <ToolbarButton
        label="Highlight"
        active={state.highlight}
        onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}
      >
        {icons.highlight}
      </ToolbarButton>
    </BubbleMenu>
  );
}
