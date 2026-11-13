import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  // Marks the bundle as a Client Component so it can be imported straight
  // into a Next.js App Router server component.
  banner: { js: '"use client";' },
});
