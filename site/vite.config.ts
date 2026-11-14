import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default // Relative asset paths, so the built page works at any URL, including a GitHub Pages sub-path.
defineConfig({ base: "./", plugins: [react()] });
