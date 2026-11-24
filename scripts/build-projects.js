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

    let files = []
    try {
      files = await readdir(projectsDir)
    } catch (error) {
      if (error.code === 'ENOENT') {
        await writeFile(join(outputDir, 'manifest.json'), '[]', 'utf-8')
        await writeFile(join(publicProjectsDir, 'manifest.json'), '[]', 'utf-8')
        return
      }
      throw error
    }

    const markdownFiles = files.filter(file => extname(file) === '.md').sort()

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

      if (data.draft) {
        console.log(`⊘ Draft project skipped: ${file}`)
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
        date_started
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
