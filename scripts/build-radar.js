import { readdir, readFile, mkdir, writeFile, rm } from 'fs/promises'
import { join, basename, extname } from 'path'
import { pathToFileURL } from 'url'
import matter from 'gray-matter'
import {
  projectRoot,
  SITE_BASE,
  getMarked,
  escapeHtml,
  normalizeDate,
  formatDisplayDate,
  stripHtml,
  copyFavicon,
  getBlogCSS,
  entryFooterHtml
} from './lib/content-utils.js'

const radarDir = join(projectRoot, 'radar')
const outputDir = join(projectRoot, 'dist', 'radar')
const publicRadarDir = join(projectRoot, 'public', 'radar')

const marked = getMarked()

function inferSource(url) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function normalizeTags(tags) {
  if (!tags) return []
  if (Array.isArray(tags)) {
    return tags.map(t => String(t).trim()).filter(Boolean)
  }
  if (typeof tags === 'string') {
    return tags.split(',').map(t => t.trim()).filter(Boolean)
  }
  return []
}

function deriveDateAndSlug(file, data) {
  const base = basename(file, '.md')
  let date = normalizeDate(data.date)
  let slug = data.slug ? String(data.slug).trim() : null

  const dashMatch = base.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/)
  const compactMatch = base.match(/^(\d{8})-(.+)$/)

  if (dashMatch) {
    if (!date) date = dashMatch[1]
    if (!slug) slug = dashMatch[2]
  } else if (compactMatch) {
    const raw = compactMatch[1]
    if (!date) date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
    if (!slug) slug = compactMatch[2]
  } else {
    if (!slug) slug = base
  }

  if (!date) date = new Date().toISOString().split('T')[0]
  return { date, slug }
}

function generateRadarPageHTML(item, css) {
  const canonicalUrl = `${SITE_BASE}${item.permalink}`
  const description = item.excerpt || item.title
  const formattedDate = formatDisplayDate(item.date)

  const titleMarkup = item.url
    ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="radar-page-title-link">${escapeHtml(item.title)} <i class="fa-solid fa-arrow-up-right-from-square radar-ext-icon" aria-hidden="true"></i></a>`
    : escapeHtml(item.title)

  const sourceBadge = item.source
    ? `<span class="radar-page-source">${escapeHtml(item.source)}</span>`
    : ''

  const tagsMarkup = item.tags.length > 0
    ? `<div class="radar-page-tags">${item.tags.map(t => `<span class="radar-page-tag">#${escapeHtml(t)}</span>`).join('')}</div>`
    : ''

  const visitLinkMarkup = item.url
    ? `<p class="radar-page-visit"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Open on ${escapeHtml(item.source || item.url)} <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a></p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZEZGNBEQJF"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-ZEZGNBEQJF');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(item.title)} — Reuben Peter-Paul</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Reuben Peter-Paul">
  <meta property="og:title" content="${escapeHtml(item.title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(item.title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="RSS">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <style>
${css}
  </style>
  <script>
    (function() {
      const stored = localStorage.getItem('darkMode');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (stored === 'true' || (stored === null && prefersDark)) {
        document.documentElement.classList.add('dark');
      }
    })();
  </script>
</head>
<body>
  <main class="markdown-body radar-page">
    <nav>
      <a href="/#${escapeHtml(item.anchor)}">← Back to Worth Looking At</a>
    </nav>
    <article class="radar-page-entry">
      <div class="radar-page-meta">
        <time datetime="${escapeHtml(item.date)}">${escapeHtml(formattedDate)}</time>
        ${sourceBadge}
      </div>
      <h1>${titleMarkup}</h1>
      <div class="radar-page-body">
${item.bodyHtml}
      </div>
      ${visitLinkMarkup}
      ${tagsMarkup}
    </article>
${entryFooterHtml()}
  </main>
</body>
</html>`
}

export async function parseRadar() {
  let files = []
  try {
    files = await readdir(radarDir)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }

  const markdownFiles = files.filter(file => extname(file) === '.md').sort()
  const items = []
  const seenSlugs = new Set()

  for (const file of markdownFiles) {
    const filePath = join(radarDir, file)
    const rawMarkdown = await readFile(filePath, 'utf-8')
    const { data, content } = matter(rawMarkdown)

    if (data.draft) {
      items.push({ file, draft: true })
      continue
    }

    const { date, slug: baseSlug } = deriveDateAndSlug(file, data)
    let slug = baseSlug
    if (seenSlugs.has(slug)) {
      slug = basename(file, '.md')
    }
    seenSlugs.add(slug)

    const title = data.title ? String(data.title).trim() : slug
    const url = data.url ? String(data.url).trim() : null
    const source = data.source ? String(data.source).trim() : inferSource(url)
    const tags = normalizeTags(data.tags)
    const bodyHtml = content.trim() ? marked.parse(content.trim()) : ''
    const excerpt = stripHtml(bodyHtml)

    items.push({
      file,
      draft: false,
      title,
      slug,
      anchor: `radar-${slug}`,
      date,
      url,
      source,
      tags,
      bodyHtml,
      excerpt,
      permalink: `/radar/${slug}.html`
    })
  }

  return items
}

export async function buildRadar() {
  try {
    await copyFavicon()
    await rm(outputDir, { recursive: true, force: true })
    await rm(publicRadarDir, { recursive: true, force: true })
    await mkdir(outputDir, { recursive: true })
    await mkdir(publicRadarDir, { recursive: true })

    const css = await getBlogCSS()
    const parsed = await parseRadar()
    const published = []

    for (const item of parsed) {
      if (item.draft) {
        console.log(`⊘ Draft radar item skipped: ${item.file}`)
        continue
      }
      published.push(item)
    }

    published.sort((a, b) => b.date.localeCompare(a.date) || b.file.localeCompare(a.file))

    const manifest = []
    for (const item of published) {
      const html = generateRadarPageHTML(item, css)
      const outFile = `${item.slug}.html`
      await writeFile(join(outputDir, outFile), html, 'utf-8')
      await writeFile(join(publicRadarDir, outFile), html, 'utf-8')

      manifest.push({
        title: item.title,
        slug: item.slug,
        anchor: item.anchor,
        date: item.date,
        url: item.url,
        source: item.source,
        tags: item.tags,
        bodyHtml: item.bodyHtml,
        excerpt: item.excerpt,
        permalink: item.permalink
      })
      console.log(`✓ Radar: ${outFile}`)
    }

    const manifestJson = JSON.stringify(manifest, null, 2)
    await writeFile(join(outputDir, 'manifest.json'), manifestJson, 'utf-8')
    await writeFile(join(publicRadarDir, 'manifest.json'), manifestJson, 'utf-8')
    console.log(`✓ Generated radar manifest (${manifest.length} item(s))`)
  } catch (error) {
    console.error('Error building radar:', error)
    process.exit(1)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildRadar()
}
