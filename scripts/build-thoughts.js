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
function generateHTML(title, content, css) {
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
  <title>${escapeHtml(title)}</title>
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
  <div class="markdown-body">
    <nav>
      <a href="/">← Back to home</a>
    </nav>
${content}
  </div>
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
        slug = dateMatch1[2]
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
          slug = dateMatch2[4]
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
        }
      }
      
      // Extract excerpt (first paragraph or first 150 chars)
      const excerptMatch = markdown.match(/^#\s+.+?\n\n(.+?)(?:\n\n|$)/s)
      const excerpt = excerptMatch 
        ? excerptMatch[1].replace(/[#*`]/g, '').trim().substring(0, 150) + '...'
        : markdown.replace(/^#\s+.+?\n\n/, '').substring(0, 150).trim() + '...'
      
      // Generate HTML file
      const html = generateHTML(title, htmlContent, css)
      
      // Write HTML file - keep date prefix in filename
      const outputFileName = basename(file, '.md') + '.html'
      
      // Write to dist/blog/ (for production)
      const outputPath = join(outputDir, outputFileName)
      await writeFile(outputPath, html, 'utf-8')
      
      // Also write to public/blog/ (for dev server)
      await mkdir(publicBlogDir, { recursive: true })
      const publicOutputPath = join(publicBlogDir, outputFileName)
      await writeFile(publicOutputPath, html, 'utf-8')
      
      // Add to manifest
      blogManifest.push({
        title,
        slug: slug,
        date: date || new Date().toISOString().split('T')[0],
        excerpt,
        filename: outputFileName
      })
      
      console.log(`✓ Generated: ${outputFileName}`)
    }

    // Sort manifest by date (newest first)
    blogManifest.sort((a, b) => new Date(b.date) - new Date(a.date))

    // Write manifest JSON to dist/blog (for production)
    const manifestPath = join(outputDir, 'manifest.json')
    await writeFile(manifestPath, JSON.stringify(blogManifest, null, 2), 'utf-8')
    console.log(`✓ Generated: manifest.json`)

    // Also write manifest to public/blog (for dev server)
    await mkdir(publicBlogDir, { recursive: true })
    const publicManifestPath = join(publicBlogDir, 'manifest.json')
    await writeFile(publicManifestPath, JSON.stringify(blogManifest, null, 2), 'utf-8')
    console.log(`✓ Generated: public/blog/manifest.json`)

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
