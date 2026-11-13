import { createNodeFromContent, getHTMLFromFragment, type Editor } from "@tiptap/react";
import type { Fragment } from "@tiptap/pm/model";

/** Elements that must never reach the document or the preview from model output. */
const BLOCKED = "script,style,iframe,object,embed,link,meta,base,img,picture,video,audio,source,svg,math,form,input,button,textarea,select";

const SAFE_HREF = /^(https?:|mailto:|tel:|\/|#|\?)/i;

/** Models sometimes wrap their answer in a Markdown code fence despite being asked not to. */
export function stripCodeFence(raw: string): string {
  return raw
    .replace(/^\s*```[a-z]*\s*\n?/i, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

/**
 * Makes model output safe to preview and insert.
 *
 * The text is parsed in an inert document (nothing loads or runs), stripped of
 * anything that could execute or phone home, then round-tripped through the
 * editor's own schema so only nodes, marks and attributes the editor supports survive.
 * Images are removed on purpose: a remote image URL written by a model can leak document text.
 */
export function sanitizeAIOutput(editor: Editor, raw: string): string {
  const html = stripCodeFence(raw);
  if (!html) return "";

  const inert = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  inert.querySelectorAll(BLOCKED).forEach((el) => el.remove());
  inert.querySelectorAll("a[href]").forEach((a) => {
    if (!SAFE_HREF.test(a.getAttribute("href")?.trim() ?? "")) a.removeAttribute("href");
  });

  const fragment = createNodeFromContent(inert.body.innerHTML, editor.schema, { slice: true }) as Fragment;
  return getHTMLFromFragment(fragment, editor.schema);
}
