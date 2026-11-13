import { useEditorState, type Editor } from "@tiptap/react";
import { useRef, useState, type ReactNode } from "react";
import { icons } from "./icons";
import { Popover, ToolbarButton } from "./Popover";
import type { ToolbarItem } from "./types";

type ButtonItem =
  | "undo"
  | "redo"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "code"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule"
  | "clearFormatting";

const LABELS: Record<Exclude<ToolbarItem, "|">, string> = {
  ai: "Ask AI",
  undo: "Undo",
  redo: "Redo",
  heading: "Text style",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  strike: "Strikethrough",
  code: "Inline code",
  textColor: "Text colour",
  highlight: "Highlight",
  align: "Align",
  bulletList: "Bullet list",
  orderedList: "Numbered list",
  taskList: "Task list",
  blockquote: "Quote",
  codeBlock: "Code block",
  link: "Link",
  image: "Image",
  table: "Table",
  horizontalRule: "Divider",
  clearFormatting: "Clear formatting",
  fullscreen: "Fullscreen",
};

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = IS_MAC ? "⌘" : "Ctrl+";
const SHIFT = IS_MAC ? "⇧" : "Shift+";
const ALT = IS_MAC ? "⌥" : "Alt+";

const HINTS: Partial<Record<ButtonItem, string>> = {
  undo: `${MOD}Z`,
  redo: `${MOD}${SHIFT}Z`,
  bold: `${MOD}B`,
  italic: `${MOD}I`,
  underline: `${MOD}U`,
  strike: `${MOD}${SHIFT}S`,
  code: `${MOD}E`,
  bulletList: `${MOD}${SHIFT}8`,
  orderedList: `${MOD}${SHIFT}7`,
  taskList: `${MOD}${SHIFT}9`,
  blockquote: `${MOD}${SHIFT}B`,
  codeBlock: `${MOD}${ALT}C`,
};

export const RUN: Record<ButtonItem, (editor: Editor) => void> = {
  undo: (e) => e.chain().focus().undo().run(),
  redo: (e) => e.chain().focus().redo().run(),
  bold: (e) => e.chain().focus().toggleBold().run(),
  italic: (e) => e.chain().focus().toggleItalic().run(),
  underline: (e) => e.chain().focus().toggleUnderline().run(),
  strike: (e) => e.chain().focus().toggleStrike().run(),
  code: (e) => e.chain().focus().toggleCode().run(),
  bulletList: (e) => e.chain().focus().toggleBulletList().run(),
  orderedList: (e) => e.chain().focus().toggleOrderedList().run(),
  taskList: (e) => e.chain().focus().toggleTaskList().run(),
  blockquote: (e) => e.chain().focus().toggleBlockquote().run(),
  codeBlock: (e) => e.chain().focus().toggleCodeBlock().run(),
  horizontalRule: (e) => e.chain().focus().setHorizontalRule().run(),
  clearFormatting: (e) => e.chain().focus().unsetAllMarks().clearNodes().run(),
};

const TEXT_COLORS = [
  ["Grey", "#6b7280"],
  ["Red", "#dc2626"],
  ["Orange", "#ea580c"],
  ["Amber", "#ca8a04"],
  ["Green", "#16a34a"],
  ["Teal", "#0d9488"],
  ["Blue", "#2563eb"],
  ["Purple", "#7c3aed"],
  ["Pink", "#db2777"],
] as const;

const HIGHLIGHT_COLORS = [
  ["Yellow", "#fef08a"],
  ["Green", "#bbf7d0"],
  ["Blue", "#bfdbfe"],
  ["Purple", "#e9d5ff"],
  ["Pink", "#fbcfe8"],
  ["Orange", "#fed7aa"],
  ["Grey", "#e5e7eb"],
] as const;

const ALIGNMENTS = [
  ["left", "Align left", icons.alignLeft],
  ["center", "Align centre", icons.alignCenter],
  ["right", "Align right", icons.alignRight],
  ["justify", "Justify", icons.alignJustify],
] as const;

const HEADINGS = [
  [0, "Paragraph"],
  [1, "Heading 1"],
  [2, "Heading 2"],
  [3, "Heading 3"],
] as const;

export function readMarks(editor: Editor) {
  return {
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strike: editor.isActive("strike"),
    code: editor.isActive("code"),
  };
}

function readState(editor: Editor) {
  const level = ([1, 2, 3] as const).find((l) => editor.isActive("heading", { level: l })) ?? 0;
  return {
    editable: editor.isEditable,
    heading: level,
    align: ALIGNMENTS.find(([a]) => editor.isActive({ textAlign: a }))?.[0] ?? "left",
    color: (editor.getAttributes("textStyle").color as string | undefined) ?? null,
    highlight: editor.isActive("highlight")
      ? ((editor.getAttributes("highlight").color as string | undefined) ?? HIGHLIGHT_COLORS[0][1])
      : null,
    link: editor.isActive("link"),
    inTable: editor.isActive("table"),
    active: {
      ...readMarks(editor),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      taskList: editor.isActive("taskList"),
      blockquote: editor.isActive("blockquote"),
      codeBlock: editor.isActive("codeBlock"),
    } as Partial<Record<ButtonItem, boolean>>,
    disabled: {
      undo: !editor.can().undo(),
      redo: !editor.can().redo(),
    } as Partial<Record<ButtonItem, boolean>>,
  };
}

/** Adds `https://` to bare domains; leaves explicit schemes and relative URLs alone. */
export function normalizeUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return "";
  if (/^([a-z][a-z0-9+.-]*:|\/|#|\?)/i.test(url)) return url;
  return `https://${url}`;
}

function MenuItem(props: { active?: boolean; danger?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="richkit-menu-item"
      data-active={props.active ? "" : undefined}
      data-danger={props.danger ? "" : undefined}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function Swatches(props: {
  colors: readonly (readonly [string, string])[];
  current: string | null;
  resetLabel: string;
  onPick: (color: string | null) => void;
}) {
  return (
    <div className="richkit-swatches">
      {props.colors.map(([name, color]) => (
        <button
          key={color}
          type="button"
          className="richkit-swatch"
          aria-label={name}
          title={name}
          data-active={props.current?.toLowerCase() === color ? "" : undefined}
          style={{ background: color }}
          onClick={() => props.onPick(color)}
        />
      ))}
      <button type="button" className="richkit-menu-item richkit-swatch-reset" onClick={() => props.onPick(null)}>
        {props.resetLabel}
      </button>
    </div>
  );
}

function LinkPanel({ editor, active, close }: { editor: Editor; active: boolean; close: () => void }) {
  const [url, setUrl] = useState(() => (editor.getAttributes("link").href as string | undefined) ?? "");

  const apply = () => {
    const href = normalizeUrl(url);
    close();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else if (editor.state.selection.empty && !editor.isActive("link")) {
      // Nothing selected: insert the URL itself as linked text.
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
  };

  return (
    <div className="richkit-form">
      <input
        autoFocus
        className="richkit-input"
        type="url"
        inputMode="url"
        placeholder="https://example.com"
        aria-label="Link URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
      />
      <div className="richkit-form-row">
        <button type="button" className="richkit-action" data-primary="" onClick={apply}>
          Apply
        </button>
        {active && (
          <button
            type="button"
            className="richkit-action"
            onClick={() => {
              close();
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function ImagePanel(props: {
  editor: Editor;
  close: () => void;
  onUpload?: (files: File[]) => void;
}) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const insert = () => {
    const src = normalizeUrl(url);
    if (!src) return;
    props.close();
    props.editor.chain().focus().setImage({ src, alt: alt.trim() || undefined }).run();
  };
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      insert();
    }
  };

  return (
    <div className="richkit-form">
      <input
        autoFocus
        className="richkit-input"
        type="url"
        inputMode="url"
        placeholder="https://example.com/photo.jpg"
        aria-label="Image URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={onEnter}
      />
      <input
        className="richkit-input"
        type="text"
        placeholder="Description (alt text)"
        aria-label="Image description"
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        onKeyDown={onEnter}
      />
      <div className="richkit-form-row">
        <button type="button" className="richkit-action" data-primary="" disabled={!url.trim()} onClick={insert}>
          Insert
        </button>
        {props.onUpload && (
          <>
            <button type="button" className="richkit-action" onClick={() => fileRef.current?.click()}>
              Upload…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                props.close();
                if (files.length) props.onUpload?.(files);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

const GRID = 6;

function TablePanel({ editor, inTable, close }: { editor: Editor; inTable: boolean; close: () => void }) {
  const [hover, setHover] = useState<[number, number]>([0, 0]);

  if (inTable) {
    const run = (fn: (e: Editor) => void) => () => {
      fn(editor);
      close();
    };
    return (
      <div className="richkit-menu">
        <MenuItem onClick={run((e) => e.chain().focus().addRowBefore().run())}>Insert row above</MenuItem>
        <MenuItem onClick={run((e) => e.chain().focus().addRowAfter().run())}>Insert row below</MenuItem>
        <MenuItem onClick={run((e) => e.chain().focus().addColumnBefore().run())}>Insert column left</MenuItem>
        <MenuItem onClick={run((e) => e.chain().focus().addColumnAfter().run())}>Insert column right</MenuItem>
        <MenuItem onClick={run((e) => e.chain().focus().toggleHeaderRow().run())}>Toggle header row</MenuItem>
        <span className="richkit-menu-sep" />
        <MenuItem danger onClick={run((e) => e.chain().focus().deleteRow().run())}>
          Delete row
        </MenuItem>
        <MenuItem danger onClick={run((e) => e.chain().focus().deleteColumn().run())}>
          Delete column
        </MenuItem>
        <MenuItem danger onClick={run((e) => e.chain().focus().deleteTable().run())}>
          Delete table
        </MenuItem>
      </div>
    );
  }

  return (
    <div className="richkit-grid-wrap">
      <div className="richkit-grid" onMouseLeave={() => setHover([0, 0])}>
        {Array.from({ length: GRID * GRID }, (_, i) => {
          const r = Math.floor(i / GRID) + 1;
          const c = (i % GRID) + 1;
          return (
            <button
              key={i}
              type="button"
              className="richkit-grid-cell"
              aria-label={`Insert ${r} by ${c} table`}
              data-on={r <= hover[0] && c <= hover[1] ? "" : undefined}
              onMouseEnter={() => setHover([r, c])}
              onFocus={() => setHover([r, c])}
              onClick={() => {
                close();
                editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run();
              }}
            />
          );
        })}
      </div>
      <div className="richkit-grid-label">{hover[0] ? `${hover[0]} × ${hover[1]}` : "Insert table"}</div>
    </div>
  );
}

/** Drops the AI button when AI is off, then tidies any separators left dangling. */
export function visibleItems(items: ToolbarItem[], ai: boolean): ToolbarItem[] {
  const kept = ai ? items : items.filter((item) => item !== "ai");
  return kept.filter((item, i) => item !== "|" || (i > 0 && kept[i - 1] !== "|" && i < kept.length - 1));
}

export function Toolbar(props: {
  editor: Editor;
  items: ToolbarItem[];
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onUpload?: (files: File[]) => void;
  /** Present only when the AI assistant is configured. */
  ai?: { open: boolean; onToggle: () => void };
}) {
  const { editor } = props;
  const items = visibleItems(props.items, !!props.ai);
  const state = useEditorState({ editor, selector: ({ editor: e }) => readState(e) });
  const off = !state.editable;

  const renderItem = (item: Exclude<ToolbarItem, "|">): ReactNode => {
    switch (item) {
      case "heading":
        return (
          <Popover
            wide
            label={LABELS.heading}
            disabled={off}
            trigger={<span className="richkit-btn-text">{HEADINGS[state.heading]?.[1] ?? "Paragraph"}</span>}
          >
            {(close) => (
              <div className="richkit-menu">
                {HEADINGS.map(([level, name]) => (
                  <MenuItem
                    key={level}
                    active={state.heading === level}
                    onClick={() => {
                      close();
                      if (level === 0) editor.chain().focus().setParagraph().run();
                      else editor.chain().focus().setHeading({ level }).run();
                    }}
                  >
                    <span data-level={level}>{name}</span>
                  </MenuItem>
                ))}
              </div>
            )}
          </Popover>
        );
      case "textColor":
        return (
          <Popover
            label={LABELS.textColor}
            disabled={off}
            trigger={
              <span className="richkit-ink">
                {icons.textColor}
                <span className="richkit-ink-bar" style={{ background: state.color ?? "currentColor" }} />
              </span>
            }
          >
            {(close) => (
              <Swatches
                colors={TEXT_COLORS}
                current={state.color}
                resetLabel="Default colour"
                onPick={(color) => {
                  close();
                  if (color) editor.chain().focus().setColor(color).run();
                  else editor.chain().focus().unsetColor().run();
                }}
              />
            )}
          </Popover>
        );
      case "highlight":
        return (
          <Popover
            label={LABELS.highlight}
            disabled={off}
            trigger={
              <span className="richkit-ink">
                {icons.highlight}
                <span className="richkit-ink-bar" style={{ background: state.highlight ?? "currentColor" }} />
              </span>
            }
          >
            {(close) => (
              <Swatches
                colors={HIGHLIGHT_COLORS}
                current={state.highlight}
                resetLabel="No highlight"
                onPick={(color) => {
                  close();
                  if (color) editor.chain().focus().setHighlight({ color }).run();
                  else editor.chain().focus().unsetHighlight().run();
                }}
              />
            )}
          </Popover>
        );
      case "align":
        return (
          <Popover
            label={LABELS.align}
            disabled={off}
            trigger={ALIGNMENTS.find(([a]) => a === state.align)?.[2] ?? icons.alignLeft}
          >
            {(close) => (
              <div className="richkit-row">
                {ALIGNMENTS.map(([value, label, icon]) => (
                  <ToolbarButton
                    key={value}
                    label={label}
                    active={state.align === value}
                    onClick={() => {
                      close();
                      editor.chain().focus().setTextAlign(value).run();
                    }}
                  >
                    {icon}
                  </ToolbarButton>
                ))}
              </div>
            )}
          </Popover>
        );
      case "link":
        return (
          <Popover label={LABELS.link} active={state.link} disabled={off} trigger={icons.link}>
            {(close) => <LinkPanel editor={editor} active={state.link} close={close} />}
          </Popover>
        );
      case "image":
        return (
          <Popover label={LABELS.image} disabled={off} trigger={icons.image}>
            {(close) => <ImagePanel editor={editor} close={close} onUpload={props.onUpload} />}
          </Popover>
        );
      case "table":
        return (
          <Popover label={LABELS.table} active={state.inTable} disabled={off} trigger={icons.table}>
            {(close) => <TablePanel editor={editor} inTable={state.inTable} close={close} />}
          </Popover>
        );
      case "ai":
        return (
          <ToolbarButton
            wide
            label={LABELS.ai}
            hint={`${MOD}J`}
            active={props.ai?.open}
            disabled={off}
            onClick={() => props.ai?.onToggle()}
          >
            {icons.sparkle}
            <span className="richkit-btn-text">AI</span>
          </ToolbarButton>
        );
      case "fullscreen":
        return (
          <ToolbarButton
            label={props.fullscreen ? "Exit fullscreen" : LABELS.fullscreen}
            active={props.fullscreen}
            onClick={props.onToggleFullscreen}
          >
            {props.fullscreen ? icons.exitFullscreen : icons.fullscreen}
          </ToolbarButton>
        );
      default:
        return (
          <ToolbarButton
            label={LABELS[item]}
            hint={HINTS[item]}
            active={item in state.active ? !!state.active[item] : undefined}
            disabled={off || !!state.disabled[item]}
            onClick={() => RUN[item](editor)}
          >
            {icons[item]}
          </ToolbarButton>
        );
    }
  };

  return (
    <div className="richkit-toolbar" role="toolbar" aria-label="Formatting">
      {items.map((item, i) =>
        item === "|" ? (
          <span key={i} className="richkit-sep" role="separator" aria-orientation="vertical" />
        ) : (
          <span key={i} className="richkit-item">
            {renderItem(item)}
          </span>
        ),
      )}
    </div>
  );
}
