import { RichTextEditor } from "richkit";
import { ControlledDemo } from "./ControlledDemo";

// This page is a Server Component. richkit ships with "use client",
// so it can be rendered here directly with serialisable props.
export default function Page() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: 22 }}>richkit · Next.js example</h1>

      <h2 style={{ fontSize: 16 }}>Rendered from a Server Component</h2>
      <RichTextEditor defaultValue="<p>Uncontrolled editor, no <em>use client</em> needed in this file.</p>" />

      <h2 style={{ fontSize: 16, marginTop: 32 }}>Controlled, inside a Client Component</h2>
      <ControlledDemo />
    </main>
  );
}
