import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
export default {
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
};
