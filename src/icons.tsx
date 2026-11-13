import type { ReactNode } from "react";

function Svg({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const icons = {
  undo: (
    <Svg>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </Svg>
  ),
  redo: (
    <Svg>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H10a6 6 0 0 0 0 12h3" />
    </Svg>
  ),
  bold: (
    <Svg>
      <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7z" />
      <path d="M7 12h7a3.5 3.5 0 0 1 0 7H7z" />
    </Svg>
  ),
  italic: (
    <Svg>
      <path d="M10 5h8M6 19h8M14 5l-4 14" />
    </Svg>
  ),
  underline: (
    <Svg>
      <path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14" />
    </Svg>
  ),
  strike: (
    <Svg>
      <path d="M4 12h16" />
      <path d="M16 7a4 3 0 0 0-4-2c-2.5 0-4 1.3-4 3 0 1 .5 1.7 1.5 2.3" />
      <path d="M8 17a4 3 0 0 0 4 2c2.5 0 4-1.3 4-3 0-.7-.2-1.3-.7-1.8" />
    </Svg>
  ),
  code: (
    <Svg>
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
    </Svg>
  ),
  textColor: (
    <Svg>
      <path d="m6 16 6-12 6 12M8.5 11.5h7" />
    </Svg>
  ),
  highlight: (
    <Svg>
      <path d="m14 4 6 6-8 8H6v-6z" />
      <path d="m11 7 6 6" />
    </Svg>
  ),
  alignLeft: (
    <Svg>
      <path d="M4 6h16M4 12h10M4 18h13" />
    </Svg>
  ),
  alignCenter: (
    <Svg>
      <path d="M4 6h16M7 12h10M5.5 18h13" />
    </Svg>
  ),
  alignRight: (
    <Svg>
      <path d="M4 6h16M10 12h10M7 18h13" />
    </Svg>
  ),
  alignJustify: (
    <Svg>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Svg>
  ),
  bulletList: (
    <Svg>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth="3" />
    </Svg>
  ),
  orderedList: (
    <Svg>
      <path d="M10 6h10M10 12h10M10 18h10" />
      <path d="M4 4.5 5.5 4v4M4 8h3M4 14.5c0-1 3-1 3 .3 0 1-3 1.7-3 3.2h3" strokeWidth="1.5" />
    </Svg>
  ),
  taskList: (
    <Svg>
      <rect x="3" y="4" width="6" height="6" rx="1.5" />
      <path d="m3.5 17 2 2 3.5-4M13 7h8M13 17h8" />
    </Svg>
  ),
  blockquote: (
    <Svg>
      <path d="M5 5v14" strokeWidth="3" />
      <path d="M10 8h10M10 12h10M10 16h6" />
    </Svg>
  ),
  codeBlock: (
    <Svg>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m10 9-3 3 3 3M14 9l3 3-3 3" />
    </Svg>
  ),
  link: (
    <Svg>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
    </Svg>
  ),
  image: (
    <Svg>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m21 16-5-5-9 9" />
    </Svg>
  ),
  table: (
    <Svg>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M3 15h18M10 4v16" />
    </Svg>
  ),
  horizontalRule: (
    <Svg>
      <path d="M4 12h16" />
    </Svg>
  ),
  clearFormatting: (
    <Svg>
      <path d="M6 5h12M12 5 9.5 19M4 20 20 4" />
    </Svg>
  ),
  fullscreen: (
    <Svg>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </Svg>
  ),
  exitFullscreen: (
    <Svg>
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </Svg>
  ),
  sparkle: (
    <Svg>
      <path d="M10 3.5 11.8 9l5.2 1.8-5.2 1.8L10 18l-1.8-5.4L3 10.8 8.2 9z" />
      <path d="M18.5 3v4M16.5 5h4M18.5 16.5v4M16.5 18.5h4" strokeWidth="1.6" />
    </Svg>
  ),
  close: (
    <Svg>
      <path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  ),
  chevron: (
    <Svg size={12}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  ),
} satisfies Record<string, ReactNode>;
