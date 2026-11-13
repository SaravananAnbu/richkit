import type { Editor, Extensions, JSONContent } from "@tiptap/react";
import type { AIConfig } from "./ai/types";

export type ToolbarItem =
  /** Opens the AI assistant. Only shown when the `ai` prop is set. */
  | "ai"
  | "undo"
  | "redo"
  | "heading"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "code"
  | "textColor"
  | "highlight"
  | "align"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "blockquote"
  | "codeBlock"
  | "link"
  | "image"
  | "table"
  | "horizontalRule"
  | "clearFormatting"
  | "fullscreen"
  /** Visual separator between groups. */
  | "|";

export const DEFAULT_TOOLBAR: ToolbarItem[] = [
  "ai",
  "|",
  "undo",
  "redo",
  "|",
  "heading",
  "|",
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "|",
  "textColor",
  "highlight",
  "|",
  "align",
  "bulletList",
  "orderedList",
  "taskList",
  "|",
  "blockquote",
  "codeBlock",
  "link",
  "image",
  "table",
  "horizontalRule",
  "|",
  "clearFormatting",
  "fullscreen",
];

export interface RichTextEditorProps {
  /** Controlled HTML value. Pair with `onChange`. */
  value?: string;
  /** Initial HTML for uncontrolled usage. Ignored when `value` is set. */
  defaultValue?: string;
  /**
   * Called on every content change with the document as HTML.
   * An empty document is reported as `""` (not `<p></p>`).
   */
  onChange?: (html: string, editor: Editor) => void;
  onFocus?: (editor: Editor) => void;
  onBlur?: (editor: Editor) => void;
  /** Text shown while the document is empty. */
  placeholder?: string;
  /** Set to `false` for a read-only view. Default `true`. */
  editable?: boolean;
  autoFocus?: boolean;
  /** Toolbar buttons in order, or `false` to hide the toolbar. */
  toolbar?: ToolbarItem[] | false;
  /** Floating format bar shown over selected text. Default `true`. */
  bubbleMenu?: boolean;
  /**
   * Upload an image file and resolve to its public URL. When provided, the
   * image button offers "Upload", and pasted or dropped images are uploaded.
   * Without it, images can only be added by URL.
   */
  onImageUpload?: (file: File) => Promise<string>;
  /**
   * Turns on the AI assistant (toolbar button, bubble menu button, Ctrl/Cmd+J).
   * Pass a provider with the user's own API key, or a `complete` function that
   * calls your backend. Nothing is sent anywhere until the writer asks.
   */
  ai?: AIConfig;
  /** Hard limit on the number of characters. */
  maxLength?: number;
  /** Show a word / character counter. Defaults to `true` when `maxLength` is set. */
  showCount?: boolean;
  /** `"auto"` follows the OS colour scheme. Default `"light"`. */
  theme?: "light" | "dark" | "auto";
  /** Minimum height of the editing area (CSS length or px number). */
  minHeight?: number | string;
  /** Maximum height before the editing area scrolls. */
  maxHeight?: number | string;
  /** Extra Tiptap extensions appended to the built-in set. */
  extensions?: Extensions;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  /** Accessible name for the editing area. */
  "aria-label"?: string;
}

export interface RichTextEditorRef {
  /** Underlying Tiptap editor; `null` until mounted. */
  editor: Editor | null;
  getHTML: () => string;
  getJSON: () => JSONContent | null;
  getText: () => string;
  focus: () => void;
  clear: () => void;
}
