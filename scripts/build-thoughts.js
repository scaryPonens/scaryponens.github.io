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
  absoluteUrlsInHtml,
  copyFavicon,
  getBlogCSS,
  copyAssets,
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

  const SUPABASE_URL = 'https://jqjpqhjkulvbrrnbvgeo.supabase.co'
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
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
  <div class="markdown-body" data-article-slug="${escapeHtml(slug)}">
    <nav>
      <a href="/">← Back to home</a>
    </nav>
    <div class="applause-container">
      <button id="applause-btn" class="applause-button" aria-label="Clap">
        <i class="fa-solid fa-hands-clapping applause-icon"></i>
        <span id="applause-count" class="applause-count">0</span>
      </button>
    </div>
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
  <!-- Supabase Client -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <!-- Custom Applause Button -->
  <script>
    (function() {
      const SUPABASE_URL = '${SUPABASE_URL}';
      const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
      const articleSlug = '${escapeHtml(slug)}';

      if (!SUPABASE_ANON_KEY) {
        console.warn('Supabase anon key not configured. Please add your anon key to the build script.');
        const applauseBtn = document.getElementById('applause-btn');
        if (applauseBtn) {
          applauseBtn.disabled = true;
          applauseBtn.classList.add('applause-disabled');
        }
        return;
      }

      if (typeof window.supabase === 'undefined') {
        console.error('Supabase library not loaded');
        return;
      }

      const { createClient } = window.supabase;
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const applauseBtn = document.getElementById('applause-btn');
      const applauseCount = document.getElementById('applause-count');
      let userClaps = 0;
      let totalClaps = 0;
      const MAX_CLAPS_PER_USER = 50;

      async function init() {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
          if (authError) {
            console.error('Auth error:', authError);
            return;
          }

          if (authData.user) {
            const { data: userClapData } = await supabase
              .from('claps')
              .select('clap_count')
              .eq('article_slug', articleSlug)
              .eq('user_id', authData.user.id)
              .single();

            if (userClapData) {
              userClaps = userClapData.clap_count || 0;
            }
          }

          const { data: totalData, error: totalError } = await supabase
            .from('claps')
            .select('clap_count')
            .eq('article_slug', articleSlug);

          if (!totalError && totalData) {
            totalClaps = totalData.reduce((sum, row) => sum + (row.clap_count || 0), 0);
            updateUI();
          }
        } catch (error) {
          console.error('Init error:', error);
        }
      }

      async function handleClap() {
        if (userClaps >= MAX_CLAPS_PER_USER) {
          alert('Maximum claps reached for this article!');
          return;
        }

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            await supabase.auth.signInAnonymously();
            const { data: { user: newUser } } = await supabase.auth.getUser();
            if (!newUser) return;
          }

          const currentUser = user || (await supabase.auth.getUser()).data.user;
          if (!currentUser) return;

          const { error } = await supabase
            .from('claps')
            .upsert({
              article_slug: articleSlug,
              user_id: currentUser.id,
              clap_count: (userClaps || 0) + 1
            }, {
              onConflict: 'article_slug,user_id'
            });

          if (error) {
            console.error('Clap error:', error);
            return;
          }

          userClaps++;
          totalClaps++;
          updateUI();

          applauseBtn.classList.add('applause-animate');
          setTimeout(() => applauseBtn.classList.remove('applause-animate'), 300);
        } catch (error) {
          console.error('Clap handler error:', error);
        }
      }

      function updateUI() {
        applauseCount.textContent = totalClaps || '0';
        applauseBtn.disabled = userClaps >= MAX_CLAPS_PER_USER;
        if (userClaps >= MAX_CLAPS_PER_USER) {
          applauseBtn.classList.add('applause-disabled');
        } else {
          applauseBtn.classList.remove('applause-disabled');
        }
      }

      applauseBtn.addEventListener('click', handleClap);
      init();
    })();
  </script>
</body>
</html>`
}

export async function parseThoughts() {
  let files = []
  try {
    files = await readdir(thoughtsDir)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }

  const markdownFiles = files.filter(file => extname(file) === '.md').sort()
  const entries = []

  for (const file of markdownFiles) {
    const filePath = join(thoughtsDir, file)
    const rawMarkdown = await readFile(filePath, 'utf-8')
    const { data, content } = matter(rawMarkdown)

    const draft = Boolean(data.draft)
    const unlisted = Boolean(data.unlisted)

    if (draft) {
      entries.push({ file, draft: true, unlisted })
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
      if (entry.draft) {
        console.log(`⊘ Draft skipped: ${entry.file}`)
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
