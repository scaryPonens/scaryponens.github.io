import { readdir, readFile, mkdir, writeFile, rm } from 'fs/promises'
import { join, basename, extname } from 'path'
import { pathToFileURL } from 'url'
import matter from 'gray-matter'
import {
  projectRoot,
  getMarked,
  escapeHtml,
  copyFavicon,
  getBlogCSS,
  copyAssets,
  googleFontsHeadHtml,
  themeInitScriptHtml,
  standaloneTopbarHtml,
  themeToggleScriptHtml,
  entryFooterHtml
} from './lib/content-utils.js'

const projectsDir = join(projectRoot, 'projects')
const outputDir = join(projectRoot, 'dist', 'projects')
const publicProjectsDir = join(projectRoot, 'public', 'projects')

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

export async function buildProjects() {
  try {
    await copyFavicon()
    await rm(outputDir, { recursive: true, force: true })
    await rm(publicProjectsDir, { recursive: true, force: true })
    await mkdir(outputDir, { recursive: true })
    await mkdir(publicProjectsDir, { recursive: true })

    const css = await getBlogCSS()

    const assetsSourceDir = join(projectsDir, 'assets')
    await copyAssets(assetsSourceDir, join(outputDir, 'assets'))
    await copyAssets(assetsSourceDir, join(publicProjectsDir, 'assets'))

    let dirents = []
    try {
      dirents = await readdir(projectsDir, { withFileTypes: true })
    } catch (error) {
      if (error.code === 'ENOENT') {
        await writeFile(join(outputDir, 'manifest.json'), '[]', 'utf-8')
        await writeFile(join(publicProjectsDir, 'manifest.json'), '[]', 'utf-8')
        return
      }
      throw error
    }

    const markdownFiles = dirents
      .filter(entry => entry.isFile() && extname(entry.name) === '.md')
      .map(entry => entry.name)
      .sort()

    if (markdownFiles.length === 0) {
      console.log('No markdown files found in projects/ directory')
      await writeFile(join(outputDir, 'manifest.json'), '[]', 'utf-8')
      await writeFile(join(publicProjectsDir, 'manifest.json'), '[]', 'utf-8')
      return
    }

    console.log(`Processing ${markdownFiles.length} project markdown file(s)...`)

    const projectsManifest = []

    for (const file of markdownFiles) {
      const filePath = join(projectsDir, file)
      const rawMarkdown = await readFile(filePath, 'utf-8')
      const { data, content } = matter(rawMarkdown)

      if (data.draft || data.archived) {
        console.log(`⊘ ${data.archived ? 'Archived' : 'Draft'} project skipped: ${file}`)
        continue
      }

      const unlisted = Boolean(data.unlisted)
      const htmlContent = marked.parse(content)

      let title = data.title
      if (!title) {
        const titleMatch = content.match(/^#\s+(.+)$/m)
        title = titleMatch ? titleMatch[1] : basename(file, '.md')
      }

      let excerpt = data.tldr ?? data.excerpt ?? ''
      if (!excerpt) {
        const contentAfterTitle = content.replace(/^#\s+.+?\n+/, '')
        const firstParagraphMatch = contentAfterTitle.match(/^(.+?)(?:\n\n|\n#|$)/s)
        if (firstParagraphMatch) {
          excerpt = firstParagraphMatch[1]
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            .replace(/[#*`_~]/g, '')
            .replace(/\n+/g, ' ')
            .trim()
        }
        if (!excerpt) {
          excerpt = contentAfterTitle.replace(/[#*`_~]/g, '').substring(0, 150).trim() + '...'
        }
      }

      const rawDate = data.date_started ?? data.started
      const parsedDate = rawDate ? new Date(rawDate) : null
      const date_started = (parsedDate && !isNaN(parsedDate.getTime())) ? parsedDate.toISOString() : null
      const year = (parsedDate && !isNaN(parsedDate.getTime())) ? String(parsedDate.getUTCFullYear()) : null
      const stack = data.stack ? String(data.stack).trim() : null

      const slug = basename(file, '.md')
      const outputFileName = slug + '.html'
      const html = generateHTML(title, htmlContent, css, slug, { unlisted })

      await writeFile(join(outputDir, outputFileName), html, 'utf-8')
      await writeFile(join(publicProjectsDir, outputFileName), html, 'utf-8')

      if (unlisted) {
        console.log(`⊘ Unlisted project (HTML generated, omitted from manifest): ${outputFileName}`)
        continue
      }

      projectsManifest.push({
        title,
        slug,
        excerpt,
        filename: outputFileName,
        date_started,
        year,
        stack
      })

      console.log(`✓ Generated: ${outputFileName}`)
    }

    projectsManifest.sort((a, b) => {
      const timeA = a.date_started ? new Date(a.date_started).getTime() : 0
      const timeB = b.date_started ? new Date(b.date_started).getTime() : 0
      if (timeA !== timeB) return timeB - timeA
      return a.title.localeCompare(b.title)
    })

    const manifestJson = JSON.stringify(projectsManifest, null, 2)
    await writeFile(join(outputDir, 'manifest.json'), manifestJson, 'utf-8')
    await writeFile(join(publicProjectsDir, 'manifest.json'), manifestJson, 'utf-8')
    console.log(`✓ Generated projects manifest (${projectsManifest.length} listed)`)
  } catch (error) {
    console.error('Error building projects:', error)
    process.exit(1)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildProjects()
}
