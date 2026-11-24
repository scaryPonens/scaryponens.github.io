# scaryponens.github.io (`reubenpeterpaul.com`)

Personal working radar and field notebook built with React 18 + Vite, with Markdown-driven static pipelines for:

- `now.md` → `dist/now.json` (current practice/focus box)
- `radar/*.md` → `dist/radar/manifest.json` + standalone `/radar/<slug>.html` permalink pages + RSS
- `thoughts/*.md` → Field Notes (`dist/blog/*.html` + `dist/blog/manifest.json` + RSS)
- `projects/*.md` → `dist/projects/*.html` + `dist/projects/manifest.json`
- `dist/feed.xml` → unified RSS feed combining published Radar items and Field Notes (newest-first)

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

## Adding a Radar entry (~3 minutes)

Create a Markdown file in `radar/` named `YYYY-MM-DD-short-slug.md`:

```markdown
---
title: "Short plain title of the link or note"
date: 2026-11-24
url: https://example.com/article   # optional — omit for a standalone note
source: example.com                # optional — inferred from url hostname if omitted
tags: [shaping, agents]            # optional
draft: false                       # optional — set true to skip manifest, HTML, and RSS
---

2–5 short sentences in your own words: why it is worth a look.
```

Building generates:
- An item in **Worth Looking At** on the home page with anchor `#radar-<slug>`
- A standalone permalink page at `/radar/<slug>.html` (with OpenGraph metadata for sharing)
- An entry in `/feed.xml`

## Frontmatter flags & archiving for Field Notes & Projects

- `draft: true` or `archived: true` — skipped completely (no HTML, no manifest, no RSS).
- `thoughts/archive/` & `projects/archive/` — subdirectories are ignored by the build scripts so archived entries and assets stay in git history without being emitted to `public/` or `dist/`.
- `unlisted: true` — HTML page is still generated (with `noindex`) so existing direct links do not 404, but the entry is omitted from the home page list and `/feed.xml`.
- `external_url` (`thoughts/*.md`) — listed in the Field Notes manifest and RSS feed without generating a local HTML article page.

## Updating the Now box

Edit top-level `now.md` (`updated` frontmatter + Markdown list/text). `scripts/build-now.js` builds it into `public/now.json` and `dist/now.json`.

## Content pipeline scripts

`npm run build` runs `npm run build:content` before `vite build`:

- `scripts/build-thoughts.js` — builds `blog/*.html` and `blog/manifest.json`
- `scripts/build-projects.js` — builds `projects/*.html` and `projects/manifest.json`
- `scripts/build-radar.js` — builds `radar/*.html` and `radar/manifest.json`
- `scripts/build-now.js` — builds `now.json` from `now.md`
- `scripts/build-feed.js` — builds unified `feed.xml` from published Radar items and Field Notes

## CI/CD

- **CI**: `.github/workflows/ci.yml`
  - install deps (`npm ci`)
  - build check (`npm run build`)
  - security gate (`npm audit --audit-level=high`)
- **Deploy**: `.github/workflows/deploy.yml`
  - builds and deploys `dist/` to GitHub Pages on `master`
