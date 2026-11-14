// Builds the library, packs it, and reinstalls the fresh tarball into every example app.
// The landing page (site/) installs the published package from npm instead, so it is not touched here.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { relative } from "node:path";

const run = (cmd, cwd = ".") => execSync(cmd, { cwd, stdio: "inherit" });

for (const file of readdirSync(".")) {
  if (/^richkit-.*\.tgz$/.test(file)) rmSync(file);
}

run("npm run build");
run("npm pack");

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const tarball = `richkit-${version}.tgz`;
const apps = readdirSync("examples").map((name) => `examples/${name}`);

for (const dir of apps) {
  const manifest = `${dir}/package.json`;
  if (!existsSync(manifest)) continue;

  // Point the app at the tarball for the current version.
  const pkg = JSON.parse(readFileSync(manifest, "utf8"));
  pkg.dependencies.richkit = `file:${relative(dir, tarball)}`;
  writeFileSync(manifest, `${JSON.stringify(pkg, null, 2)}\n`);

  // npm caches file: tarballs by version, so drop the old copy and its lock entry.
  rmSync(`${dir}/node_modules/richkit`, { recursive: true, force: true });
  rmSync(`${dir}/package-lock.json`, { force: true });
  rmSync(`${dir}/node_modules/.vite`, { recursive: true, force: true });
  run("npm install", dir);
}
