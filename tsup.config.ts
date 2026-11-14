import { defineConfig } from "tsup";

const shared = {
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  // The build script empties dist/ first; cleaning here would race between the two builds.
  clean: false,
} as const;

export default defineConfig([
  {
    ...shared,
    entry: ["src/index.ts"],
    external: ["react", "react-dom"],
    // Marks the bundle as a Client Component so it can be imported straight
    // into a Next.js App Router server component.
    banner: { js: '"use client";' },
  },
  {
    // Prompt helpers for backends. Deliberately has no "use client" banner:
    // a server cannot call functions that live in a client module.
    ...shared,
    entry: ["src/server.ts"],
  },
]);
