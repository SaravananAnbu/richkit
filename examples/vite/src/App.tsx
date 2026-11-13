import { useState } from "react";
import { RichTextEditor, type AIRequest } from "richkit";
import "richkit/styles.css";

const INITIAL = `
<h2>Hello from richkit</h2>
<p>Select text to see the <strong>bubble menu</strong>, or use the toolbar for <span style="color: #7c3aed">colour</span>, <mark data-color="#fef08a" style="background-color: #fef08a">highlight</mark> and alignment.</p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><p>Task lists</p></li>
  <li data-type="taskItem" data-checked="false"><p>Tables and images</p></li>
</ul>
<table><tbody>
  <tr><th><p>Feature</p></th><th><p>Status</p></th></tr>
  <tr><td><p>Tables</p></td><td><p>Resizable columns</p></td></tr>
</tbody></table>
`;

// Demo only: a real app would upload the file and return its public URL.
const fakeUpload = (file: File) =>
  new Promise<string>((resolve) => setTimeout(() => resolve(URL.createObjectURL(file)), 800));

// Stand-in for a real model so the AI panel can be tried with no key and no network.
// A real app passes `ai={{ provider, apiKey }}` or a `complete` that calls its backend.
async function* mockModel({ action, prompt, selection, signal }: AIRequest) {
  const reply =
    `<p><strong>Mock reply</strong> for “${action}”${prompt ? ` (${prompt})` : ""}. ` +
    `This text is generated locally to show streaming, preview and accept.</p>` +
    (selection ? `<p>The selection was ${selection.replace(/<[^>]+>/g, "").length} characters long.</p>` : "") +
    `<ul><li>Nothing is sent anywhere</li><li>Press Replace or Insert to apply it</li></ul>`;
  for (const word of reply.split(/(?<= )/)) {
    if (signal.aborted) return;
    await new Promise((resolve) => setTimeout(resolve, 45));
    yield word;
  }
}

export function App() {
  const [html, setHtml] = useState(INITIAL);
  const [dark, setDark] = useState(false);

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: "32px 16px",
        background: dark ? "#010409" : "#f3f4f6",
        color: dark ? "#e6edf3" : "#1f2328",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22 }}>richkit · Vite example</h1>
        <p style={{ fontSize: 14, opacity: 0.7 }}>The AI button here uses a local mock model, so it works offline.</p>
        <label style={{ display: "block", margin: "12px 0" }}>
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} /> Dark theme
        </label>
        <RichTextEditor
          value={html}
          onChange={setHtml}
          onImageUpload={fakeUpload}
          ai={{ complete: mockModel }}
          placeholder="Write something…"
          theme={dark ? "dark" : "light"}
          minHeight={260}
          maxLength={2000}
        />
        <h2 style={{ fontSize: 15, marginTop: 24 }}>HTML output</h2>
        <pre data-testid="output" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13 }}>
          {html}
        </pre>
      </div>
    </main>
  );
}
