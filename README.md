# scaryponens.github.io

Personal site built with React + Vite, with markdown-driven content pipelines for:

- `thoughts/*.md` → blog pages + manifest + RSS
- `projects/*.md` → project pages + manifest

## Requirements

- Node.js 22+
- npm

## Local development

```bash
npm ci
npm run dev
```

## Production build

```bash
npm ci
npm run build
npm run preview
```

## Content pipeline notes

The build runs custom scripts before bundling:

- `scripts/build-thoughts.js`
  - parses frontmatter/content
  - generates `dist/blog/*.html`
  - writes `dist/blog/manifest.json`
  - writes `dist/feed.xml`
- `scripts/build-projects.js`
  - generates `dist/projects/*.html`
  - writes `dist/projects/manifest.json`

If a thought has `external_url` in frontmatter, it is listed in manifests/feed without generating a local HTML article page.

## CI/CD

- **CI**: `.github/workflows/ci.yml`
  - install deps
  - build check
  - security gate via `npm audit --audit-level=high`
- **Deploy**: `.github/workflows/deploy.yml`
  - builds and deploys `dist/` to GitHub Pages on `master`
