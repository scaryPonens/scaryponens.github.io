import { readdir, readFile, mkdir, writeFile, rm } from 'fs/promises'
import { join, basename, extname } from 'path'
import { pathToFileURL } from 'url'
import matter from 'gray-matter'
import {
  projectRoot,
  getMarked,
  escapeHtml,
  normalizeDate,
  absoluteUrlsInHtml,
  copyFavicon,
  getBlogCSS,
  copyAssets,
  googleFontsHeadHtml,
  themeInitScriptHtml,
  standaloneTopbarHtml,
  themeToggleScriptHtml,
  entryFooterHtml
} from './lib/content-utils.js'

const thoughtsDir = join(projectRoot, 'thoughts')
const outputDir = join(projectRoot, 'dist', 'blog')
const publicBlogDir = join(projectRoot, 'public', 'blog')

const marked = getMarked()

function generateHTML(title, content, css, slug, { unlisted = false } = {}) {
  const GISCUS_REPO = 'scaryPonens/scaryponens.github.io'
  const GISCUS_REPO_ID = 'MDEwOlJlcG9zaXRvcnk1ODIxMzc2MQ=='
  const GISCUS_CATEGORY = 'Comments'
  const GISCUS_CATEGORY_ID = 'DIC_kwDOA3hFgc4C1xNm'
  const GISCUS_MAPPING = 'pathname'

  const robotsMeta = unlisted ? '\n  <meta name="robots" content="noindex">' : ''

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
  <meta name="article:slug" content="${escapeHtml(slug)}">${robotsMeta}
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="RSS">
${googleFontsHeadHtml()}
  <style>
${css}
  </style>
${themeInitScriptHtml()}
</head>
<body>
  <div class="markdown-body" data-article-slug="${escapeHtml(slug)}">
${standaloneTopbarHtml('/')}
${content}
${entryFooterHtml()}
    <div class="comments-section">
      <h2>Comments</h2>
      <div class="giscus-container"></div>
      <script src="https://giscus.app/client.js"
        data-repo="${GISCUS_REPO}"
        data-repo-id="${GISCUS_REPO_ID}"
        data-category="${GISCUS_CATEGORY}"
        data-category-id="${GISCUS_CATEGORY_ID}"
        data-mapping="${GISCUS_MAPPING}"
        data-strict="0"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="top"
        data-theme="preferred_color_scheme"
        data-lang="en"
        data-loading="lazy"
        crossorigin="anonymous"
        async>
      </script>
    </div>
  </div>
${themeToggleScriptHtml()}
</body>
</html>`
}

export async function parseThoughts() {
  let dirents = []
  try {
    dirents = await readdir(thoughtsDir, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }

  const markdownFiles = dirents
    .filter(entry => entry.isFile() && extname(entry.name) === '.md')
    .map(entry => entry.name)
    .sort()
  const entries = []

  for (const file of markdownFiles) {
    const filePath = join(thoughtsDir, file)
    const rawMarkdown = await readFile(filePath, 'utf-8')
    const { data, content } = matter(rawMarkdown)

    const draft = Boolean(data.draft)
    const archived = Boolean(data.archived)
    const unlisted = Boolean(data.unlisted)

    if (draft || archived) {
      entries.push({ file, draft, archived, unlisted })
      continue
    }

    if (data.external_url) {
      const title = data.title || basename(file, '.md')
      const date = normalizeDate(data.date) || new Date().toISOString().split('T')[0]
      const excerpt = data.excerpt || ''

      entries.push({
        file,
        title,
        slug: basename(file, '.md'),
        date,
        excerpt,
        external_url: data.external_url,
        draft: false,
        unlisted,
        htmlContent: null,
        rssContentHtml: null
      })
      continue
    }

    const htmlContent = marked.parse(content)
    const titleMatch = content.match(/^#\s+(.+)$/m)
    let title = data.title || (titleMatch ? titleMatch[1] : basename(file, '.md'))

    let date = normalizeDate(data.date)
    let datePrefix = ''
    let slug = basename(file, '.md')

    if (!date) {
      const dateMatch1 = file.match(/^(\d{8})-(.+)$/)
      if (dateMatch1) {
        const dateStr = dateMatch1[1]
        date = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
        datePrefix = dateMatch1[1] + '-'
        slug = dateMatch1[2].replace(/\.md$/, '')
        if (title.startsWith(datePrefix)) title = title.substring(datePrefix.length)
      } else {
        const dateMatch2 = file.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/)
        if (dateMatch2) {
          date = `${dateMatch2[1]}-${dateMatch2[2]}-${dateMatch2[3]}`
          datePrefix = `${dateMatch2[1]}-${dateMatch2[2]}-${dateMatch2[3]}-`
          slug = dateMatch2[4].replace(/\.md$/, '')
          if (title.startsWith(datePrefix)) title = title.substring(datePrefix.length)
        } else {
          const dateMatch3 = file.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
          if (dateMatch3) {
            date = `${dateMatch3[1]}-${dateMatch3[2].padStart(2, '0')}-${dateMatch3[3].padStart(2, '0')}`
          }
          slug = slug.replace(/\.md$/, '')
        }
      }
    }

    let excerpt = data.excerpt
    if (!excerpt) {
      const excerptMatch = content.match(/^#\s+.+?\n\n(.+?)(?:\n\n|$)/s)
      excerpt = excerptMatch
        ? excerptMatch[1].replace(/[#*`]/g, '').trim().substring(0, 150) + '...'
        : content.replace(/^#\s+.+?\n\n/, '').substring(0, 150).trim() + '...'
    }

    const filename = basename(file, '.md') + '.html'
    const entryDate = date || new Date().toISOString().split('T')[0]

    entries.push({
      file,
      title,
      slug,
      date: entryDate,
      excerpt,
      filename,
      external_url: null,
      draft: false,
      unlisted,
      htmlContent,
      rssContentHtml: absoluteUrlsInHtml(htmlContent, '/blog')
    })
  }

  return entries
}

export async function buildThoughts() {
  try {
    await copyFavicon()
    await rm(outputDir, { recursive: true, force: true })
    await rm(publicBlogDir, { recursive: true, force: true })
    await mkdir(outputDir, { recursive: true })
    await mkdir(publicBlogDir, { recursive: true })

    const css = await getBlogCSS()

    const assetsSourceDir = join(thoughtsDir, 'assets')
    await copyAssets(assetsSourceDir, join(outputDir, 'assets'))
    await copyAssets(assetsSourceDir, join(publicBlogDir, 'assets'))

    const entries = await parseThoughts()
    if (entries.length === 0) {
      console.log('No markdown files found in thoughts/ directory')
      await writeFile(join(outputDir, 'manifest.json'), '[]', 'utf-8')
      await writeFile(join(publicBlogDir, 'manifest.json'), '[]', 'utf-8')
      return
    }

    console.log(`Processing ${entries.length} field note markdown file(s)...`)

    const blogManifest = []

    for (const entry of entries) {
      if (entry.draft || entry.archived) {
        console.log(`⊘ ${entry.archived ? 'Archived' : 'Draft'} skipped: ${entry.file}`)
        continue
      }

      if (entry.external_url) {
        if (entry.unlisted) {
          console.log(`⊘ Unlisted external skipped from manifest: ${entry.title}`)
          continue
        }
        blogManifest.push({
          title: entry.title,
          slug: entry.slug,
          date: entry.date,
          excerpt: entry.excerpt,
          external_url: entry.external_url
        })
        console.log(`✓ External: ${entry.title}`)
        continue
      }

      const html = generateHTML(entry.title, entry.htmlContent, css, entry.slug, {
        unlisted: entry.unlisted
      })

      await writeFile(join(outputDir, entry.filename), html, 'utf-8')
      await writeFile(join(publicBlogDir, entry.filename), html, 'utf-8')

      if (entry.unlisted) {
        console.log(`⊘ Unlisted (HTML generated, omitted from manifest/feed): ${entry.filename}`)
        continue
      }

      blogManifest.push({
        title: entry.title,
        slug: entry.slug,
        date: entry.date,
        excerpt: entry.excerpt,
        filename: entry.filename
      })
      console.log(`✓ Generated: ${entry.filename}`)
    }

    blogManifest.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))

    const manifestJson = JSON.stringify(blogManifest, null, 2)
    await writeFile(join(outputDir, 'manifest.json'), manifestJson, 'utf-8')
    await writeFile(join(publicBlogDir, 'manifest.json'), manifestJson, 'utf-8')
    console.log(`✓ Generated blog manifest (${blogManifest.length} listed)`)
  } catch (error) {
    console.error('Error building thoughts:', error)
    process.exit(1)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildThoughts()
}
