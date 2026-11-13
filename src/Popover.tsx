import { useEffect, useRef, useState, type ReactNode } from "react";
import { icons } from "./icons";

export function ToolbarButton(props: {
  label: string;
  /** Shortcut hint appended to the tooltip. */
  hint?: string;
  active?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  wide?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="richkit-btn"
      aria-label={props.label}
      aria-pressed={props.active === undefined || props.expanded !== undefined ? undefined : props.active}
      aria-expanded={props.expanded}
      aria-haspopup={props.expanded === undefined ? undefined : "true"}
      data-tip={props.expanded ? undefined : props.hint ? `${props.label} (${props.hint})` : props.label}
      data-active={props.active ? "" : undefined}
      data-wide={props.wide ? "" : undefined}
      disabled={props.disabled}
      // Keep the text selection in the editor when clicking a button.
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

/** A toolbar button that opens a small panel beneath it. */
export function Popover(props: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  /** Text trigger with a chevron instead of a square icon button. */
  wide?: boolean;
  trigger: ReactNode;
  onOpen?: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [alignEnd, setAlignEnd] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (props.disabled) setOpen(false);
  }, [props.disabled]);

  const toggle = () => {
    if (!open) {
      // Open towards whichever side of the editor has more room.
      const wrap = wrapRef.current;
      const root = wrap?.closest(".richkit");
      if (wrap && root) {
        const w = wrap.getBoundingClientRect();
        const r = root.getBoundingClientRect();
        setAlignEnd(w.left - r.left > r.width / 2);
      }
      props.onOpen?.();
    }
    setOpen(!open);
  };

  return (
    <span
      className="richkit-pop"
      ref={wrapRef}
      onKeyDown={(e) => {
        if (open && e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <ToolbarButton
        label={props.label}
        active={props.active || open}
        disabled={props.disabled}
        expanded={open}
        wide={props.wide}
        onClick={toggle}
      >
        {props.trigger}
        {props.wide && icons.chevron}
      </ToolbarButton>
      {open && (
        <div
          className="richkit-panel"
          role="dialog"
          aria-label={props.label}
          data-align={alignEnd ? "end" : "start"}
          // Clicking panel controls must not steal the editor selection; inputs still need focus.
          onMouseDown={(e) => {
            if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
          }}
        >
          {props.children(() => setOpen(false))}
        </div>
      )}
    </span>
  );
}
