import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AIPanel } from "./ai/AIPanel";
import { AIRangeExtension } from "./ai/range";
import { BubbleBar } from "./BubbleBar";
import { Toolbar } from "./Toolbar";
import { DEFAULT_TOOLBAR, type RichTextEditorProps, type RichTextEditorRef } from "./types";

/** HTML of the document, or `""` when it is just one empty paragraph. */
function toHTML(editor: Editor): string {
  const { doc } = editor.state;
  const only = doc.childCount === 1 ? doc.firstChild : null;
  // Not `editor.isEmpty`: that also treats an empty table as "no content".
  const blank = only?.type.name === "paragraph" && only.content.size === 0;
  return blank ? "" : editor.getHTML();
}

function toCssLength(value: number | string | undefined): string | undefined {
  return typeof value === "number" ? `${value}px` : value;
}

function imageFiles(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
}

function Footer(props: { editor: Editor; showCount: boolean; maxLength?: number; uploading: number }) {
  const count = useEditorState({
    editor: props.editor,
    selector: ({ editor: e }) => ({
      words: e.storage.characterCount.words(),
      characters: e.storage.characterCount.characters(),
    }),
  });
  const { maxLength } = props;

  return (
    <div className="richkit-footer">
      <span className="richkit-status" role="status">
        {props.uploading > 0 ? (props.uploading > 1 ? `Uploading ${props.uploading} images…` : "Uploading image…") : ""}
      </span>
      {props.showCount && (
        <span className="richkit-count" data-full={maxLength && count.characters >= maxLength ? "" : undefined}>
          {count.words} {count.words === 1 ? "word" : "words"} ·{" "}
          {maxLength ? `${count.characters} / ${maxLength}` : count.characters}{" "}
          {count.characters === 1 && !maxLength ? "character" : "characters"}
        </span>
      )}
    </div>
  );
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  function RichTextEditor(props, ref) {
    const {
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      placeholder = "",
      editable = true,
      autoFocus = false,
      toolbar = DEFAULT_TOOLBAR,
      bubbleMenu = true,
      onImageUpload,
      ai,
      maxLength,
      showCount = maxLength !== undefined,
      theme = "light",
      minHeight,
      maxHeight,
      extensions,
      className,
      style,
      id,
      "aria-label": ariaLabel = "Rich text editor",
    } = props;

    const rootRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<Editor | null>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [uploading, setUploading] = useState(0);
    const [aiOpen, setAIOpen] = useState(false);
    const aiEnabled = !!ai && editable;

    // Latest callbacks, so the editor never has to be recreated when they change.
    const handlers = useRef({ onChange, onFocus, onBlur, onImageUpload });
    handlers.current = { onChange, onFocus, onBlur, onImageUpload };

    /** Uploads files through `onImageUpload` and inserts each one when its URL resolves. */
    const uploadImages = useCallback((files: File[], pos?: number) => {
      const upload = handlers.current.onImageUpload;
      if (!upload || files.length === 0) return;
      setUploading((n) => n + files.length);
      for (const file of files) {
        upload(file)
          .then((src) => {
            const ed = editorRef.current;
            if (!ed || ed.isDestroyed || !src) return;
            const at = Math.min(pos ?? ed.state.selection.to, ed.state.doc.content.size);
            ed.chain().insertContentAt(at, { type: "image", attrs: { src, alt: file.name } }).run();
          })
          .catch((error) => console.error("[richkit] Image upload failed:", error))
          .finally(() => setUploading((n) => n - 1));
      }
    }, []);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          link: {
            openOnClick: false,
            autolink: true,
            HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
          },
        }),
        Placeholder.configure({ placeholder }),
        CharacterCount.configure({ limit: maxLength }),
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TaskList,
        TaskItem.configure({ nested: true }),
        TableKit.configure({ table: { resizable: true } }),
        Image,
        AIRangeExtension,
        ...(extensions ?? []),
      ],
      content: value ?? defaultValue ?? "",
      editable,
      autofocus: autoFocus,
      // Required for SSR (Next.js): render on the client only, avoiding hydration mismatches.
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "richkit-content",
          role: "textbox",
          "aria-multiline": "true",
          "aria-label": ariaLabel,
        },
        handlePaste: (_view, event) => {
          const files = imageFiles(event.clipboardData?.files);
          if (!files.length || !handlers.current.onImageUpload) return false;
          event.preventDefault();
          uploadImages(files);
          return true;
        },
        handleDrop: (view, event, _slice, moved) => {
          const files = imageFiles(event.dataTransfer?.files);
          if (moved || !files.length || !handlers.current.onImageUpload) return false;
          event.preventDefault();
          uploadImages(files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos);
          return true;
        },
      },
      onUpdate: ({ editor: e }) => handlers.current.onChange?.(toHTML(e), e),
      onFocus: ({ editor: e }) => handlers.current.onFocus?.(e),
      onBlur: ({ editor: e }) => handlers.current.onBlur?.(e),
    });
    editorRef.current = editor;

    // Controlled mode: push external `value` changes into the editor.
    useEffect(() => {
      if (!editor || value === undefined) return;
      if (value === toHTML(editor) || value === editor.getHTML()) return;
      editor.commands.setContent(value, { emitUpdate: false });
    }, [editor, value]);

    useEffect(() => {
      if (editor && editor.isEditable !== editable) editor.setEditable(editable);
    }, [editor, editable]);

    useEffect(() => {
      if (!aiEnabled) setAIOpen(false);
    }, [aiEnabled]);

    // Fullscreen covers the page, so stop the page behind it from scrolling.
    useEffect(() => {
      if (!fullscreen) return;
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }, [fullscreen]);

    useImperativeHandle(
      ref,
      () => ({
        editor,
        getHTML: () => (editor ? toHTML(editor) : ""),
        getJSON: () => editor?.getJSON() ?? null,
        getText: () => editor?.getText() ?? "",
        focus: () => void editor?.commands.focus(),
        clear: () => void editor?.commands.clearContent(true),
      }),
      [editor],
    );

    const vars = {
      "--richkit-min-height": toCssLength(minHeight),
      "--richkit-max-height": toCssLength(maxHeight),
    } as React.CSSProperties;

    return (
      <div
        ref={rootRef}
        id={id}
        className={className ? `richkit ${className}` : "richkit"}
        data-theme={theme}
        data-readonly={editable ? undefined : ""}
        data-fullscreen={fullscreen ? "" : undefined}
        style={{ ...vars, ...style }}
        onKeyDown={(e) => {
          if (fullscreen && e.key === "Escape") setFullscreen(false);
          if (aiEnabled && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "j") {
            e.preventDefault();
            setAIOpen((open) => !open);
          }
        }}
      >
        {editor && ((toolbar && toolbar.length > 0) || aiOpen) && (
          <div className="richkit-head">
            {toolbar && toolbar.length > 0 && (
              <Toolbar
                editor={editor}
                items={toolbar}
                fullscreen={fullscreen}
                onToggleFullscreen={() => setFullscreen((f) => !f)}
                onUpload={onImageUpload ? uploadImages : undefined}
                ai={aiEnabled ? { open: aiOpen, onToggle: () => setAIOpen((open) => !open) } : undefined}
              />
            )}
            {aiEnabled && aiOpen && ai && <AIPanel editor={editor} config={ai} onClose={() => setAIOpen(false)} />}
          </div>
        )}
        <EditorContent editor={editor} className="richkit-body" />
        {editor && bubbleMenu && editable && (
          <BubbleBar
            editor={editor}
            appendTo={() => rootRef.current!}
            onAskAI={aiEnabled ? () => setAIOpen(true) : undefined}
          />
        )}
        {editor && (showCount || uploading > 0) && (
          <Footer editor={editor} showCount={showCount} maxLength={maxLength} uploading={uploading} />
        )}
      </div>
    );
  },
);
