import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { RichTextEditor, type AIConfig } from "richkit";

const ACCENTS = [
  { name: "Vermilion", light: "#d9480f", dark: "#ff8a5b" },
  { name: "Blue", light: "#2563eb", dark: "#6ea8fe" },
  { name: "Violet", light: "#7c3aed", dark: "#a78bfa" },
  { name: "Green", light: "#15803d", dark: "#4ade80" },
] as const;

const DEMO_CONTENT = `
<h2>Try it — this is the real component</h2>
<p>Select any text to get the <strong>floating format bar</strong>. Use the toolbar for <span style="color: #7c3aed">colour</span>, <mark data-color="#fef08a" style="background-color: #fef08a">highlight</mark>, alignment, links and more.</p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><p>Install with one command</p></li>
  <li data-type="taskItem" data-checked="true"><p>Import one component and one stylesheet</p></li>
  <li data-type="taskItem" data-checked="false"><p>Paste or drop an image in here</p></li>
</ul>
<table><tbody>
  <tr><th><p>Works with</p></th><th><p>How</p></th></tr>
  <tr><td><p>Vite</p></td><td><p>Import and render</p></td></tr>
  <tr><td><p>Next.js</p></td><td><p>Server Components and App Router, no hydration warnings</p></td></tr>
</tbody></table>
<blockquote><p>Everything you type stays in this page. Nothing is sent anywhere.</p></blockquote>
`;

const PROVIDERS = [
  { id: "claude", name: "Claude", modelHint: "claude-opus-5-5 (default)", modelRequired: false },
  { id: "openai", name: "OpenAI", modelHint: "Model id (required)", modelRequired: true },
  { id: "gemini", name: "Gemini", modelHint: "Model id (required)", modelRequired: true },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

const AI_ACTIONS = [
  "Improve writing",
  "Fix grammar",
  "Shorten",
  "Expand",
  "Simplify",
  "Change tone",
  "Translate",
  "Continue writing",
  "Summarise",
  "Ask anything",
];

const FEATURES: { tag: string; title: string; body: string }[] = [
  {
    tag: "table",
    title: "Tables",
    body: "Pick a size from a grid, then add or remove rows and columns. Columns resize by dragging.",
  },
  {
    tag: "image",
    title: "Images, your storage",
    body: "Insert by URL, or pass one upload function to enable the Upload button, paste and drag-and-drop.",
  },
  {
    tag: "taskList",
    title: "Task lists",
    body: "Checkable items alongside bullet and numbered lists, with nesting.",
  },
  {
    tag: "textColor",
    title: "Colour and highlight",
    body: "Swatch pickers for text colour and highlight, plus left, centre, right and justified alignment.",
  },
  {
    tag: "bubbleMenu",
    title: "Format bar on selection",
    body: "Bold, italic, underline, strikethrough, code and highlight appear right where the writer is working.",
  },
  {
    tag: "theme",
    title: "Light, dark, or yours",
    body: "Three built-in themes and a set of CSS variables for accent, radius, font and every surface.",
  },
  {
    tag: "use client",
    title: "Next.js ready",
    body: "Ships marked as a Client Component and renders after hydration, so it drops into the App Router.",
  },
  {
    tag: "maxLength",
    title: "Counts and limits",
    body: "A word and character counter, a hard character limit, a read-only mode and a fullscreen toggle.",
  },
];

const SNIPPETS = {
  Vite: `import { useState } from "react";
import { RichTextEditor } from "richkit";
import "richkit/styles.css";

export function Notes() {
  const [html, setHtml] = useState("<p>Hello</p>");

  return (
    <RichTextEditor
      value={html}
      onChange={setHtml}
      placeholder="Write something…"
    />
  );
}`,
  "Next.js": `// app/layout.tsx
import "richkit/styles.css";

// app/page.tsx — a Server Component works as-is
import { RichTextEditor } from "richkit";

export default function Page() {
  return <RichTextEditor defaultValue="<p>Hello</p>" />;
}

// To use onChange, put the editor in a file
// that starts with "use client".`,
  AI: `// The user's own key, straight from the browser
<RichTextEditor ai={{ provider: "claude", apiKey: userKey }} />
<RichTextEditor ai={{ provider: "openai", apiKey: userKey, model }} />
<RichTextEditor ai={{ provider: "gemini", apiKey: userKey, model }} />

// Or your own backend, so your key never leaves the server
<RichTextEditor
  ai={{
    complete: ({ action, prompt, selection, document, signal }) =>
      fetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({ action, prompt, selection, document }),
        signal,
      }),
  }}
/>`,
  Uploads: `<RichTextEditor
  onImageUpload={async (file) => {
    const body = new FormData();
    body.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body });
    return (await res.json()).url; // the image's public URL
  }}
/>`,
} as const;

const PROPS: [name: string, type: string, note: string][] = [
  ["value", "string", "Controlled HTML value. Pair with onChange."],
  ["defaultValue", "string", "Initial HTML for uncontrolled use."],
  ["onChange", "(html, editor) => void", "Fires on every change. An empty document is reported as an empty string."],
  ["placeholder", "string", "Text shown while the document is empty."],
  ["editable", "boolean", "Set to false for a read-only view."],
  ["toolbar", "ToolbarItem[] | false", "Choose and order the buttons, or hide the toolbar."],
  ["bubbleMenu", "boolean", "Floating format bar over selected text. On by default."],
  ["onImageUpload", "(file) => Promise<string>", "Upload a file and return its URL. Enables upload, paste and drop."],
  ["ai", "AIConfig", "Turns on the AI assistant with a provider and key, or your own backend function."],
  ["maxLength", "number", "Hard character limit."],
  ["showCount", "boolean", "Word and character counter in the footer."],
  ["theme", '"light" | "dark" | "auto"', "Auto follows the operating system."],
  ["minHeight / maxHeight", "number | string", "Size of the editing area."],
  ["extensions", "Extensions", "Add any Tiptap extension to the built-in set."],
  ["ref", "RichTextEditorRef", "getHTML, getText, getJSON, focus, clear and the Tiptap editor."],
];

// Demo only: shows the picked file from memory instead of uploading it anywhere.
const localPreview = (file: File) =>
  new Promise<string>((resolve) => setTimeout(() => resolve(URL.createObjectURL(file)), 600));

const NPM_URL = "https://www.npmjs.com/package/richkit";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className="copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          // Clipboard unavailable (insecure context or denied): leave the text selectable.
        }
      }}
    >
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

function Section(props: { id: string; eyebrow: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={props.id} className="section">
      <div className="wrap">
        <p className="eyebrow">{props.eyebrow}</p>
        <h2>{props.title}</h2>
        {props.lead && <p className="lead">{props.lead}</p>}
        {props.children}
      </div>
    </section>
  );
}

export function App() {
  const [dark, setDark] = useState(
    () => typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [accent, setAccent] = useState(0);
  const [html, setHtml] = useState(DEMO_CONTENT);
  const [tab, setTab] = useState<keyof typeof SNIPPETS>("Vite");
  const [provider, setProvider] = useState<ProviderId>("claude");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  // The key lives only in this component's state: never stored, logged or sent anywhere but the chosen provider.
  const providerInfo = PROVIDERS.find((p) => p.id === provider)!;
  const key = apiKey.trim();
  const modelId = model.trim();
  const aiReady = key.length > 0 && (!providerInfo.modelRequired || modelId.length > 0);
  const ai: AIConfig | undefined = !aiReady
    ? undefined
    : provider === "claude"
      ? { provider, apiKey: key, model: modelId || undefined }
      : { provider, apiKey: key, model: modelId };

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  const color = ACCENTS[accent]!;
  const accentValue = dark ? color.dark : color.light;

  return (
    <div className="page" style={{ "--accent": accentValue } as CSSProperties}>
      <header className="nav">
        <div className="wrap nav-inner">
          <a href="#top" className="brand">
            <span className="brand-mark" aria-hidden="true">
              R
            </span>
            richkit
          </a>
          <nav aria-label="Sections">
            <a href="#demo">Demo</a>
            <a href="#ai">AI</a>
            <a href="#features">Features</a>
            <a href="#usage">Usage</a>
            <a href="#props">Props</a>
            <a href={NPM_URL} target="_blank" rel="noreferrer">
              npm ↗
            </a>
          </nav>
          <button type="button" className="ghost" aria-pressed={dark} onClick={() => setDark(!dark)}>
            {dark ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap">
            <p className="eyebrow">Free · MIT licensed · React 18+</p>
            <h1>
              The rich text editor you <em>drop in</em> and ship.
            </h1>
            <p className="lead">
              One React component and one stylesheet. Tables, images, task lists, colour, dark mode and an AI
              writing assistant are already inside, and it works in Vite and Next.js without extra setup.
            </p>
            <div className="hero-actions">
              <div className="install">
                <code>npm install richkit</code>
                <CopyButton text="npm install richkit" />
              </div>
              <a className="cta" href="#demo">
                Try the editor
              </a>
              <a className="npm-link" href={NPM_URL} target="_blank" rel="noreferrer">
                View on npm ↗
              </a>
            </div>
          </div>
        </section>

        <section id="demo" className="demo">
          <div className="wrap">
            <div className="demo-bar">
              <span className="demo-label">Live demo</span>
              <div className="swatches" role="group" aria-label="Accent colour">
                {ACCENTS.map((a, i) => (
                  <button
                    key={a.name}
                    type="button"
                    className="swatch"
                    aria-label={a.name}
                    aria-pressed={i === accent}
                    title={a.name}
                    style={{ background: dark ? a.dark : a.light }}
                    onClick={() => setAccent(i)}
                  />
                ))}
              </div>
            </div>
            <RichTextEditor
              className="demo-editor"
              value={html}
              onChange={setHtml}
              onImageUpload={localPreview}
              ai={ai}
              theme={dark ? "dark" : "light"}
              placeholder="Write something…"
              minHeight={320}
              showCount
              aria-label="richkit live demo"
            />
            <details className="output">
              <summary>See the HTML it produces</summary>
              <pre>{html || "(empty)"}</pre>
            </details>
          </div>
        </section>

        <Section
          id="ai"
          eyebrow="New in 0.2"
          title="An AI assistant that asks before it edits."
          lead="Select text and pick an action, or type what you want. The answer streams into a preview, and nothing in the document changes until the writer accepts it. One undo takes it back."
        >
          <div className="ai-grid">
            <div>
              <ul className="chips">
                {AI_ACTIONS.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
              <p className="ai-copy">
                Works with Claude, OpenAI and Gemini using the reader's own key, or with any model through one function
                that calls your backend. Model output is cleaned before it is shown or inserted.
              </p>
            </div>
            <form className="keybox" onSubmit={(e) => e.preventDefault()}>
              <h3>Try it in the demo above</h3>
              <p>
                Add your own API key and an <strong>AI</strong> button appears in the demo's toolbar. The key stays in
                this tab's memory and goes only to the provider you pick. Reloading the page clears it.
              </p>
              <label>
                Provider
                <select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value as ProviderId);
                    setModel("");
                  }}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                API key
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Paste your key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </label>
              <label>
                Model
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={providerInfo.modelHint}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </label>
              <p className="keybox-status" role="status" data-ready={aiReady ? "" : undefined}>
                {aiReady ? (
                  <>
                    AI is on. <a href="#demo">Go to the demo</a> and press the AI button.
                  </>
                ) : key && providerInfo.modelRequired ? (
                  "Enter a model id to turn AI on."
                ) : (
                  "AI is off until you add a key."
                )}
              </p>
            </form>
          </div>
        </Section>

        <Section
          id="features"
          eyebrow="What's inside"
          title="Everything a writer expects, nothing to assemble."
          lead="Each item below is on by default. Turn any of it off, or reorder the toolbar, with a single prop."
        >
          <ul className="features">
            {FEATURES.map((f) => (
              <li key={f.tag}>
                <code>{f.tag}</code>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="usage"
          eyebrow="Usage"
          title="Import it. Render it. Done."
          lead="HTML goes in and HTML comes out, so it fits whatever you already store."
        >
          <div className="code">
            <div className="code-head">
              <div className="tabs" role="tablist" aria-label="Examples">
                {(Object.keys(SNIPPETS) as (keyof typeof SNIPPETS)[]).map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="tab"
                    aria-selected={tab === name}
                    onClick={() => setTab(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <CopyButton text={SNIPPETS[tab]} />
            </div>
            <pre role="tabpanel">
              <code>{SNIPPETS[tab]}</code>
            </pre>
          </div>

          <div className="theming">
            <div>
              <h3>Make it match your product</h3>
              <p>
                Override a few CSS variables and the toolbar, menus, links and focus ring all follow. The colour dots
                above the demo do exactly this.
              </p>
            </div>
            <pre>
              <code>{`.richkit {
  --richkit-accent: ${accentValue};
  --richkit-radius: 12px;
  --richkit-font: inherit;
}`}</code>
            </pre>
          </div>
        </Section>

        <Section id="props" eyebrow="Reference" title="Props" lead="All optional. With none, you get a full editor.">
          <div className="table-scroll">
            <table className="props">
              <thead>
                <tr>
                  <th scope="col">Prop</th>
                  <th scope="col">Type</th>
                  <th scope="col">What it does</th>
                </tr>
              </thead>
              <tbody>
                {PROPS.map(([name, type, note]) => (
                  <tr key={name}>
                    <th scope="row">
                      <code>{name}</code>
                    </th>
                    <td>
                      <code>{type}</code>
                    </td>
                    <td>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <section className="closing">
          <div className="wrap">
            <h2>Add it to your app in a minute.</h2>
            <div className="install">
              <code>npm install richkit</code>
              <CopyButton text="npm install richkit" />
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <span>
            richkit · MIT licensed · free to use in any project ·{" "}
            <a href={NPM_URL} target="_blank" rel="noreferrer">
              npm
            </a>
          </span>
          <span>
            Built on <a href="https://tiptap.dev">Tiptap</a> and <a href="https://prosemirror.net">ProseMirror</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
