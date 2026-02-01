import { readdir, readFile, mkdir, writeFile, copyFile, stat } from 'fs/promises'
import { join, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { marked } from 'marked'
import hljs from 'highlight.js'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const projectsDir = join(projectRoot, 'projects')
const outputDir = join(projectRoot, 'dist', 'projects')
const publicProjectsDir = join(projectRoot, 'public', 'projects')

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

// Read blog CSS (reuse the same styling)
async function getBlogCSS() {
  const cssPath = join(projectRoot, 'src', 'styles', 'blog.css')
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
async function buildProjects() {
  try {
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true })

    // Read CSS
    const css = await getBlogCSS()

    // Copy assets directory to output directories
    const assetsSourceDir = join(projectsDir, 'assets')
    const assetsOutputDir = join(outputDir, 'assets')
    const assetsPublicDir = join(publicProjectsDir, 'assets')
    
    await copyAssets(assetsSourceDir, assetsOutputDir)
    await copyAssets(assetsSourceDir, assetsPublicDir)

    // Read all markdown files from projects directory
    const files = await readdir(projectsDir)
    const markdownFiles = files.filter(file => extname(file) === '.md')

    if (markdownFiles.length === 0) {
      console.log('No markdown files found in projects/ directory')
      return
    }

    console.log(`Processing ${markdownFiles.length} project markdown file(s)...`)

    const projectsManifest = []

    // Process each markdown file
    for (const file of markdownFiles) {
      const filePath = join(projectsDir, file)
      const rawMarkdown = await readFile(filePath, 'utf-8')
      const { data, content } = matter(rawMarkdown)

      // Convert body (no frontmatter) to HTML
      const htmlContent = marked.parse(content)

      // Title: frontmatter title, else first h1, else filename
      let title = data.title
      if (!title) {
        const titleMatch = content.match(/^#\s+(.+)$/m)
        title = titleMatch ? titleMatch[1] : basename(file, '.md')
      }

      // Excerpt: frontmatter tldr or excerpt, else first paragraph from body
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

      // Generate HTML file
      const html = generateHTML(title, htmlContent, css)
      
      // Write HTML file
      const outputFileName = basename(file, '.md') + '.html'
      
      // Write to dist/projects/ (for production)
      const outputPath = join(outputDir, outputFileName)
      await writeFile(outputPath, html, 'utf-8')
      
      // Also write to public/projects/ (for dev server)
      await mkdir(publicProjectsDir, { recursive: true })
      const publicOutputPath = join(publicProjectsDir, outputFileName)
      await writeFile(publicOutputPath, html, 'utf-8')
      
      // Add to manifest
      projectsManifest.push({
        title,
        slug: basename(file, '.md'),
        excerpt,
        filename: outputFileName
      })
      
      console.log(`✓ Generated: ${outputFileName}`)
    }

    // Sort manifest by title (alphabetical)
    projectsManifest.sort((a, b) => a.title.localeCompare(b.title))

    // Write manifest JSON to dist/projects (for production)
    const manifestPath = join(outputDir, 'manifest.json')
    await writeFile(manifestPath, JSON.stringify(projectsManifest, null, 2), 'utf-8')
    console.log(`✓ Generated: manifest.json`)

    // Also write manifest to public/projects (for dev server)
    await mkdir(publicProjectsDir, { recursive: true })
    const publicManifestPath = join(publicProjectsDir, 'manifest.json')
    await writeFile(publicManifestPath, JSON.stringify(projectsManifest, null, 2), 'utf-8')
    console.log(`✓ Generated: public/projects/manifest.json`)

    console.log(`\nBuild complete! Generated ${markdownFiles.length} HTML file(s) in dist/projects/`)
  } catch (error) {
    if (error.code === 'ENOENT' && error.path === projectsDir) {
      console.log('projects/ directory does not exist. Creating it...')
      await mkdir(projectsDir, { recursive: true })
      console.log('Created projects/ directory. Add markdown files and rebuild.')
      return
    }
    console.error('Error building projects:', error)
    process.exit(1)
  }
}

buildProjects()
