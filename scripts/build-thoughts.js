import { readdir, readFile, mkdir, writeFile, copyFile, stat } from 'fs/promises'
import { join, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { marked } from 'marked'
import hljs from 'highlight.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const thoughtsDir = join(projectRoot, 'thoughts')
const outputDir = join(projectRoot, 'dist', 'blog')
const publicBlogDir = join(projectRoot, 'public', 'blog')

const SITE_BASE = process.env.SITE_BASE || 'https://scaryponens.github.io'

// Configure marked with highlight.js
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (err) {
        console.warn(`Error highlighting ${lang}:`, err)
      }
    }
    return hljs.highlightAuto(code).value
  },
  langPrefix: 'hljs language-',
  breaks: true,
  gfm: true
})

// Read blog CSS
async function getBlogCSS() {
  const cssPath = join(projectRoot, 'src', 'styles', 'blog.css')
  return await readFile(cssPath, 'utf-8')
}

// Generate HTML template
function generateHTML(title, content, css, slug, articleUrl) {
  // Giscus configuration
  const GISCUS_REPO = 'scaryPonens/scaryponens.github.io'
  const GISCUS_REPO_ID = 'MDEwOlJlcG9zaXRvcnk1ODIxMzc2MQ=='
  const GISCUS_CATEGORY = 'Comments'
  const GISCUS_CATEGORY_ID = 'DIC_kwDOA3hFgc4C1xNm'
  const GISCUS_MAPPING = 'pathname' // Use pathname mapping
  
  // Supabase configuration
  // Get your anon key from: Supabase Dashboard > Project Settings > API > anon/public key
  const SUPABASE_URL = 'https://jqjpqhjkulvbrrnbvgeo.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxanBxaGprdWx2YnJybmJ2Z2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzQ2MTEsImV4cCI6MjA4NTYxMDYxMX0.Hphz5CR-OdJwf7Xxk8SE2_AEerixpk6EX9hi-VN_hbw' // TODO: Add your Supabase anon/public key here
  
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
  <meta name="article:slug" content="${escapeHtml(slug)}">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <style>
${css}
  </style>
  <script>
    // Initialize dark mode on page load
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
        // Show button but disable it
        const applauseBtn = document.getElementById('applause-btn');
        if (applauseBtn) {
          applauseBtn.disabled = true;
          applauseBtn.classList.add('applause-disabled');
        }
        return;
      }
      
      // Wait for Supabase to load
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
      
      // Initialize: Sign in anonymously and load claps
      async function init() {
        try {
          // Sign in anonymously
          const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
          if (authError) {
            console.error('Auth error:', authError);
            return;
          }
          
          // Load user's existing claps
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
          
          // Load total claps for article
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
      
      // Handle clap click
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
          
          // Upsert clap (increment if exists, create if not)
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
          
          // Animate button
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
      
      // Event listeners
      applauseBtn.addEventListener('click', handleClap);
      
      // Initialize on load
      init();
    })();
  </script>
</body>
</html>`
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

function escapeXml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return String(text).replace(/[&<>"']/g, m => map[m])
}

// Rewrite relative URLs in HTML to absolute (especially assets) for use in RSS
function absoluteUrlsInHtml(html) {
  const blogBase = SITE_BASE + '/blog'
  return html
    .replace(/\bsrc="assets\//g, `src="${blogBase}/assets/`)
    .replace(/\bsrc='assets\//g, `src='${blogBase}/assets/`)
    .replace(/\bhref="assets\//g, `href="${blogBase}/assets/`)
    .replace(/\bhref='assets\//g, `href='${blogBase}/assets/`)
    .replace(/\bsrc="\/blog\/assets\//g, `src="${blogBase}/assets/`)
    .replace(/\bhref="\/blog\/assets\//g, `href="${blogBase}/assets/`)
    .replace(/\bhref="\//g, `href="${SITE_BASE}/`)
    .replace(/\bhref='\//g, `href='${SITE_BASE}/`)
}

function generateRss(rssItems) {
  const channelTitle = 'Reuben Peter-Paul — Writing'
  const channelLink = SITE_BASE + '/'
  const channelDescription = 'Writing'
  const lastBuildDate = new Date().toUTCString()

  const items = rssItems.map((entry) => {
    const link = SITE_BASE + '/blog/' + entry.filename
    const pubDate = new Date(entry.date).toUTCString()
    // Content priority: content (full HTML), then summary/description (excerpt) for readers that don't support content
    const contentEncoded = entry.contentHtml
      ? `    <content:encoded><![CDATA[\n${entry.contentHtml}\n]]></content:encoded>\n`
      : ''
    return `  <item>
    <title>${escapeXml(entry.title)}</title>
    <link>${escapeXml(link)}</link>
${contentEncoded}    <description>${escapeXml(entry.excerpt)}</description>
    <pubDate>${pubDate}</pubDate>
    <guid isPermaLink="true">${escapeXml(link)}</guid>
  </item>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>`
}

// Copy assets directory recursively
async function copyAssets(sourceDir, destDir) {
  try {
    const files = await readdir(sourceDir)
    await mkdir(destDir, { recursive: true })
    
    for (const file of files) {
      const sourcePath = join(sourceDir, file)
      const destPath = join(destDir, file)
      const fileStat = await stat(sourcePath)
      
      if (fileStat.isDirectory()) {
        await copyAssets(sourcePath, destPath)
      } else {
        await copyFile(sourcePath, destPath)
      }
    }
  } catch (error) {
    // Assets directory might not exist, which is fine
    if (error.code !== 'ENOENT') {
      console.warn(`Warning: Could not copy assets: ${error.message}`)
    }
  }
}

// Process markdown files
async function buildThoughts() {
  try {
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true })

    // Read CSS
    const css = await getBlogCSS()

    // Copy assets directory to output directories
    const assetsSourceDir = join(thoughtsDir, 'assets')
    const assetsOutputDir = join(outputDir, 'assets')
    const assetsPublicDir = join(publicBlogDir, 'assets')
    
    await copyAssets(assetsSourceDir, assetsOutputDir)
    await copyAssets(assetsSourceDir, assetsPublicDir)

    // Read all markdown files from thoughts directory
    const files = await readdir(thoughtsDir)
    const markdownFiles = files.filter(file => extname(file) === '.md')

    if (markdownFiles.length === 0) {
      console.log('No markdown files found in thoughts/ directory')
      return
    }

    console.log(`Processing ${markdownFiles.length} markdown file(s)...`)

    const blogManifest = []
    const rssItems = []

    // Process each markdown file
    for (const file of markdownFiles) {
      const filePath = join(thoughtsDir, file)
      const markdown = await readFile(filePath, 'utf-8')
      
      // Convert markdown to HTML
      const htmlContent = marked.parse(markdown)
      
      // Extract title from first h1 or use filename
      const titleMatch = markdown.match(/^#\s+(.+)$/m)
      let title = titleMatch ? titleMatch[1] : basename(file, '.md')
      
      // Extract date from filename if in format YYYYMMDD- or YYYY-MM-DD-
      // Support both formats: 20260102-example.md or 2026-01-02-example.md
      let date = null
      let datePrefix = ''
      let slug = basename(file, '.md')
      
      // Try YYYYMMDD format first (e.g., 20260102-example-thought.md)
      const dateMatch1 = file.match(/^(\d{8})-(.+)$/)
      if (dateMatch1) {
        const dateStr = dateMatch1[1]
        date = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
        datePrefix = dateMatch1[1] + '-'
        slug = dateMatch1[2].replace(/\.md$/, '') // Remove .md extension
        // Remove date prefix from title if it exists
        if (title.startsWith(datePrefix)) {
          title = title.substring(datePrefix.length)
        }
      } else {
        // Try YYYY-MM-DD format (e.g., 2026-01-02-example-thought.md)
        const dateMatch2 = file.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/)
        if (dateMatch2) {
          date = `${dateMatch2[1]}-${dateMatch2[2]}-${dateMatch2[3]}`
          datePrefix = `${dateMatch2[1]}-${dateMatch2[2]}-${dateMatch2[3]}-`
          slug = dateMatch2[4].replace(/\.md$/, '') // Remove .md extension
          // Remove date prefix from title if it exists
          if (title.startsWith(datePrefix)) {
            title = title.substring(datePrefix.length)
          }
        } else {
          // Try legacy YYYY-MM-DD format (without dash after date)
          const dateMatch3 = file.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
          if (dateMatch3) {
            date = `${dateMatch3[1]}-${dateMatch3[2].padStart(2, '0')}-${dateMatch3[3].padStart(2, '0')}`
          }
          // Ensure slug doesn't have .md extension
          slug = slug.replace(/\.md$/, '')
        }
      }
      
      // Extract excerpt (first paragraph or first 150 chars)
      const excerptMatch = markdown.match(/^#\s+.+?\n\n(.+?)(?:\n\n|$)/s)
      const excerpt = excerptMatch 
        ? excerptMatch[1].replace(/[#*`]/g, '').trim().substring(0, 150) + '...'
        : markdown.replace(/^#\s+.+?\n\n/, '').substring(0, 150).trim() + '...'
      
      // Write HTML file - keep date prefix in filename
      const outputFileName = basename(file, '.md') + '.html'
      const articleUrl = SITE_BASE + '/blog/' + outputFileName
      
      // Generate HTML file with slug and article URL
      const html = generateHTML(title, htmlContent, css, slug, articleUrl)
      
      // Write to dist/blog/ (for production)
      const outputPath = join(outputDir, outputFileName)
      await writeFile(outputPath, html, 'utf-8')
      
      // Also write to public/blog/ (for dev server)
      await mkdir(publicBlogDir, { recursive: true })
      const publicOutputPath = join(publicBlogDir, outputFileName)
      await writeFile(publicOutputPath, html, 'utf-8')
      
      // Add to manifest
      const entryDate = date || new Date().toISOString().split('T')[0]
      blogManifest.push({
        title,
        slug: slug,
        date: entryDate,
        excerpt,
        filename: outputFileName
      })

      // Collect full HTML for RSS (content:encoded); use absolute URLs for assets
      rssItems.push({
        title,
        excerpt,
        date: entryDate,
        filename: outputFileName,
        contentHtml: absoluteUrlsInHtml(htmlContent)
      })
      
      console.log(`✓ Generated: ${outputFileName}`)
    }

    // Sort manifest and RSS items by date (newest first)
    blogManifest.sort((a, b) => new Date(b.date) - new Date(a.date))
    rssItems.sort((a, b) => new Date(b.date) - new Date(a.date))

    // Write manifest JSON to dist/blog (for production)
    const manifestPath = join(outputDir, 'manifest.json')
    await writeFile(manifestPath, JSON.stringify(blogManifest, null, 2), 'utf-8')
    console.log(`✓ Generated: manifest.json`)

    // Also write manifest to public/blog (for dev server)
    await mkdir(publicBlogDir, { recursive: true })
    const publicManifestPath = join(publicBlogDir, 'manifest.json')
    await writeFile(publicManifestPath, JSON.stringify(blogManifest, null, 2), 'utf-8')
    console.log(`✓ Generated: public/blog/manifest.json`)

    // Generate RSS feed at site root (full HTML in content:encoded, description as fallback)
    const rssXml = generateRss(rssItems)
    const distFeedPath = join(projectRoot, 'dist', 'feed.xml')
    const publicFeedPath = join(projectRoot, 'public', 'feed.xml')
    await mkdir(join(projectRoot, 'dist'), { recursive: true })
    await writeFile(distFeedPath, rssXml, 'utf-8')
    console.log(`✓ Generated: feed.xml`)
    await mkdir(join(projectRoot, 'public'), { recursive: true })
    await writeFile(publicFeedPath, rssXml, 'utf-8')
    console.log(`✓ Generated: public/feed.xml`)

    console.log(`\nBuild complete! Generated ${markdownFiles.length} HTML file(s) in dist/blog/`)
  } catch (error) {
    if (error.code === 'ENOENT' && error.path === thoughtsDir) {
      console.log('thoughts/ directory does not exist. Creating it...')
      await mkdir(thoughtsDir, { recursive: true })
      console.log('Created thoughts/ directory. Add markdown files and rebuild.')
      return
    }
    console.error('Error building thoughts:', error)
    process.exit(1)
  }
}

buildThoughts()
