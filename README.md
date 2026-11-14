# richkit

A drop-in rich text editor React component. Works in Vite, Next.js (App Router and Pages Router) and any React 18+ app. MIT licensed.

**[Live demo and docs](https://saravanananbu.github.io/richkit/)** · [npm](https://www.npmjs.com/package/richkit)

- One component, one stylesheet
- Headings, lists, task lists, tables with resizable columns, images, links, code blocks
- Text colour, highlight, alignment, and a floating format bar on selection
- Image upload hook (button, paste and drag-and-drop), word / character counter, fullscreen mode
- Built-in AI assistant: rewrite, shorten, expand, translate or ask anything, with a preview before anything changes. Works with Claude, OpenAI, Gemini or your own backend
- Controlled or uncontrolled, HTML in and HTML out
- SSR-safe: ships with `"use client"` and renders on the client without hydration warnings
- Configurable toolbar, light / dark / auto themes, CSS variables for everything else
- TypeScript types included, ESM and CommonJS builds
- Built on [Tiptap](https://tiptap.dev) / ProseMirror, so you can add any Tiptap extension

## Install

```bash
npm install richkit
```

`react` and `react-dom` (18 or newer) are peer dependencies.

## Usage

```tsx
import { useState } from "react";
import { RichTextEditor } from "richkit";
import "richkit/styles.css";

export function Notes() {
  const [html, setHtml] = useState("<p>Hello</p>");
  return <RichTextEditor value={html} onChange={setHtml} placeholder="Write something…" />;
}
```

### Next.js

Import the stylesheet once in `app/layout.tsx` (or `pages/_app.tsx`):

```tsx
import "richkit/styles.css";
```

Then use the component anywhere. In a Server Component you can render it directly as long as you only pass serialisable props (`defaultValue`, `placeholder`, …). To pass `onChange`, put it in a file that starts with `"use client"`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | – | Controlled HTML value. |
| `defaultValue` | `string` | `""` | Initial HTML for uncontrolled use. |
| `onChange` | `(html, editor) => void` | – | Fires on every change. An empty document is reported as `""`. |
| `onFocus` / `onBlur` | `(editor) => void` | – | Focus events. |
| `placeholder` | `string` | `""` | Shown while empty. |
| `editable` | `boolean` | `true` | `false` makes it read-only. |
| `autoFocus` | `boolean` | `false` | Focus on mount. |
| `toolbar` | `ToolbarItem[] \| false` | all items | Buttons in order; `"\|"` is a separator; `false` hides the toolbar. |
| `bubbleMenu` | `boolean` | `true` | Floating format bar over selected text. |
| `onImageUpload` | `(file: File) => Promise<string>` | – | Upload a file and resolve to its URL. Enables the Upload button, paste and drop. |
| `ai` | `AIConfig` | – | Turns on the AI assistant. See [AI assistant](#ai-assistant). |
| `maxLength` | `number` | – | Hard character limit. |
| `showCount` | `boolean` | `true` if `maxLength` is set | Word / character counter in the footer. |
| `theme` | `"light" \| "dark" \| "auto"` | `"light"` | `"auto"` follows the OS setting. |
| `minHeight` / `maxHeight` | `number \| string` | `140px` / none | Size of the editing area. |
| `extensions` | Tiptap `Extensions` | – | Extra Tiptap extensions. |
| `className`, `style`, `id`, `aria-label` | – | – | Applied to the wrapper / editing area. |

Toolbar items: `ai` (shown only when the `ai` prop is set), `undo`, `redo`, `heading`, `bold`, `italic`, `underline`, `strike`, `code`, `textColor`, `highlight`, `align`, `bulletList`, `orderedList`, `taskList`, `blockquote`, `codeBlock`, `link`, `image`, `table`, `horizontalRule`, `clearFormatting`, `fullscreen`, `|`.

```tsx
<RichTextEditor toolbar={["bold", "italic", "|", "bulletList", "link"]} />
```

## Images

Without `onImageUpload`, images are added by URL only. Provide it to enable uploads from the toolbar, the clipboard and drag-and-drop:

```tsx
<RichTextEditor
  onImageUpload={async (file) => {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    return (await res.json()).url;
  }}
/>
```

## AI assistant

Set the `ai` prop and the editor gains an **AI** button in the toolbar and the selection bubble menu (shortcut: Ctrl/Cmd+J).

- With text selected: Improve writing, Fix grammar, Shorten, Expand, Simplify, Professional, Casual, Translate, or a typed instruction.
- With nothing selected: Continue writing, Summarise document, or a typed instruction; the result goes in at the cursor.
- The answer streams into a preview. Nothing in the document changes until the writer presses **Replace selection** or **Insert**, and one undo reverts it.

### With the user's own API key

```tsx
<RichTextEditor ai={{ provider: "claude", apiKey: userKey }} />
<RichTextEditor ai={{ provider: "openai", apiKey: userKey, model: "…" }} />
<RichTextEditor ai={{ provider: "gemini", apiKey: userKey, model: "…" }} />
```

| Provider | `model` | Notes |
| --- | --- | --- |
| `claude` | optional, defaults to `claude-opus-5-5` | On the default model, a request the API declines is retried on a fallback model automatically. |
| `openai` | required | Any Chat Completions model id. |
| `gemini` | required | Any `generateContent` model id. |

`baseURL` is also accepted, to send requests through a proxy.

> **Whose key?** The key is sent from the browser straight to the provider, so anyone using the page can read it. That is fine for a key the person typed in themselves ("bring your own key"). Never ship your own key this way: keep it on your server and use `complete` below. richkit does not store the key.

### With your own backend

```tsx
<RichTextEditor
  ai={{
    complete: ({ action, prompt, selection, document, signal }) =>
      fetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({ action, prompt, selection, document }),
        signal,
      }),
  }}
/>
```

`complete` may return a `Response`, a `ReadableStream`, an async iterable of strings, or a plain string. Whatever text it yields should be an HTML fragment.

### Keeping your own key in a server env variable

A key read from a frontend env variable (`VITE_*` in Vite, `NEXT_PUBLIC_*` in Next.js) is copied into the JavaScript every visitor downloads, so it is not secret. Use those only for local development.

For a key that belongs to you, keep it in a server-only env variable and point `complete` at your own route. `richkit/server` exports the prompt helpers without any React or editor code, so it is safe to import on a server:

```ts
// app/api/ai/route.ts (Next.js). Set ANTHROPIC_API_KEY in .env.local
import Anthropic from "@anthropic-ai/sdk";
import { buildAIPrompt } from "richkit/server";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY on the server

export async function POST(req: Request) {
  const { system, user } = buildAIPrompt(await req.json());

  const stream = client.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 64000,
    system,
    messages: [{ role: "user", content: user }],
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      stream.on("text", (text) => controller.enqueue(encoder.encode(text)));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
```

The editor side is the `complete` example above, calling `/api/ai`. The same pattern works with any provider: send `system` and `user` to the model and stream its text back.

- Import `buildAIPrompt` from `richkit/server` in server code. The main `richkit` entry is a Client Component module, and Next.js will not let a server route call functions from it.
- A route like this lets anyone who can reach it spend your AI budget. Put it behind your app's sign-in and add a rate limit before going live.
- A Vite app has no server of its own, so it needs a small backend or a serverless function for this.

| Where the key lives | Safe? | Use for |
| --- | --- | --- |
| `VITE_*` / `NEXT_PUBLIC_*` env variable | No, visible to every visitor | Local development only |
| Typed in by the user | Yes, it is their own key | Demos, personal tools |
| Server env variable + `complete` | Yes | Production apps |

### Safety

Model output is treated as untrusted. Before it is previewed or inserted it is parsed in an inert document, stripped of scripts, event handlers, unsafe links and images (a remote image URL can leak document text), and then passed through the editor's schema so only supported formatting survives.

## Ref API

```tsx
const ref = useRef<RichTextEditorRef>(null);

<RichTextEditor ref={ref} />;

ref.current?.getHTML();
ref.current?.getText();
ref.current?.getJSON();
ref.current?.focus();
ref.current?.clear();
ref.current?.editor; // the underlying Tiptap editor
```

## Theming

Override any `--richkit-*` variable:

```css
.richkit {
  --richkit-accent: #7c3aed;
  --richkit-radius: 12px;
  --richkit-font: "Inter", sans-serif;
}
```

Available variables: `bg`, `fg`, `muted`, `border`, `toolbar-bg`, `hover`, `active-bg`, `accent`, `danger`, `code-bg`, `shadow`, `radius`, `font`, `mono`, `min-height`, `max-height`, `sticky-top`.

The default font is Trebuchet MS (with system fallbacks). To use your app's own font instead, set `--richkit-font: inherit`.

The toolbar sticks to the top of the page while a long document scrolls. If your app has a fixed header, set `--richkit-sticky-top` to its height.

## Security

The editor only produces markup its schema allows, but the HTML you store is still user input. Sanitise it on the server before rendering it outside the editor.

## Development

```bash
npm install
npm run build      # ESM + CJS + types into dist/
npm test
npm run typecheck
```

The example apps in `examples/vite` and `examples/next` install the packed tarball, so they exercise exactly what gets published. After changing the library, run `npm run sync:examples` and restart the example's dev server.

### Landing page

`site/` is a static landing page with a live demo of the editor, published at https://saravanananbu.github.io/richkit/. It installs richkit from npm, so it shows the latest published version rather than local changes. Pushing a change under `site/` to `main` redeploys it through `.github/workflows/pages.yml`.

```bash
npm --prefix site run dev     # local preview
npm --prefix site run build   # static output in site/dist, deployable to any static host
```

## License

[MIT](./LICENSE)
