# Contributing to richkit

Bug reports and pull requests are welcome at https://github.com/SaravananAnbu/richkit. This file covers working on the package itself; for using it, see the [README](./README.md).

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
