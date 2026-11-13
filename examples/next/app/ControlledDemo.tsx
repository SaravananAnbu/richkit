"use client";

import { useState } from "react";
import { RichTextEditor } from "richkit";

export function ControlledDemo() {
  const [html, setHtml] = useState("<p>Edit me and watch the HTML below.</p>");

  return (
    <>
      <RichTextEditor value={html} onChange={setHtml} placeholder="Write something…" minHeight={180} />
      <pre data-testid="output" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13 }}>
        {html}
      </pre>
    </>
  );
}
