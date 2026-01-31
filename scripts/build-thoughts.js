import { readdir, readFile, mkdir, writeFile } from 'fs/promises'
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

// Read GitHub dark mode CSS
async function getGitHubCSS() {
  const cssPath = join(projectRoot, 'src', 'styles', 'github-markdown-dark.css')
  return await readFile(cssPath, 'utf-8')
}

// Generate HTML template
function generateHTML(title, content, css) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
${css}
  </style>
</head>
<body>
  <div class="markdown-body">
    <nav style="margin-bottom: 2em;">
      <a href="/" style="color: #58a6ff; text-decoration: none;">← Back to home</a>
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

// Process markdown files
async function buildThoughts() {
  try {
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true })

    // Read CSS
    const css = await getGitHubCSS()

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
      const title = titleMatch ? titleMatch[1] : basename(file, '.md')
      
      // Extract date from filename if in format YYYY-MM-DD or similar
      const dateMatch = file.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
      const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}` : null
      
      // Extract excerpt (first paragraph or first 150 chars)
      const excerptMatch = markdown.match(/^#\s+.+?\n\n(.+?)(?:\n\n|$)/s)
      const excerpt = excerptMatch 
        ? excerptMatch[1].replace(/[#*`]/g, '').trim().substring(0, 150) + '...'
        : markdown.replace(/^#\s+.+?\n\n/, '').substring(0, 150).trim() + '...'
      
      // Generate HTML file
      const html = generateHTML(title, htmlContent, css)
      
      // Write HTML file
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
        slug: basename(file, '.md'),
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
