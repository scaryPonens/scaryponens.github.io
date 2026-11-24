import { readdir, readFile, mkdir, copyFile, stat } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { marked } from 'marked'
import hljs from 'highlight.js'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const projectRoot = join(__dirname, '..', '..')
export const SITE_BASE = (process.env.SITE_BASE || 'https://reubenpeterpaul.com').replace(/\/+$/, '')

let markedConfigured = false
export function getMarked() {
  if (!markedConfigured) {
    marked.setOptions({
      highlight(code, lang) {
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
    markedConfigured = true
  }
  return marked
}

export function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return String(text).replace(/[&<>"']/g, m => map[m])
}

export function escapeXml(text) {
  return escapeHtml(text)
}

export function escapeCdata(text) {
  return String(text).replace(/\]\]>/g, ']]]]><![CDATA[>')
}

export function normalizeDate(d) {
  if (!d) return null
  if (typeof d === 'string') return d.split('T')[0]
  if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}

export function toRssPubDate(dateStr) {
  if (!dateStr) return new Date().toUTCString()
  // Use midday UTC for YYYY-MM-DD dates so local timezone conversions don't shift the calendar day
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T12:00:00Z` : dateStr
  const parsed = new Date(iso)
  return isNaN(parsed.getTime()) ? new Date().toUTCString() : parsed.toUTCString()
}

export function formatDisplayDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || ''
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

export function stripHtml(html) {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function absoluteUrlsInHtml(html, basePath = '/blog') {
  const sectionBase = SITE_BASE + basePath
  return String(html)
    .replace(/\bsrc="assets\//g, `src="${sectionBase}/assets/`)
    .replace(/\bsrc='assets\//g, `src='${sectionBase}/assets/`)
    .replace(/\bhref="assets\//g, `href="${sectionBase}/assets/`)
    .replace(/\bhref='assets\//g, `href='${sectionBase}/assets/`)
    .replace(/\bsrc="\/blog\/assets\//g, `src="${SITE_BASE}/blog/assets/`)
    .replace(/\bhref="\/blog\/assets\//g, `href="${SITE_BASE}/blog/assets/`)
    .replace(/\bhref="\//g, `href="${SITE_BASE}/`)
    .replace(/\bhref='\//g, `href='${SITE_BASE}/`)
}

export async function copyFavicon() {
  const src = join(projectRoot, 'src', 'static', 'favicon.ico')
  const dests = [
    join(projectRoot, 'public', 'favicon.ico'),
    join(projectRoot, 'dist', 'favicon.ico')
  ]
  for (const dest of dests) {
    try {
      await mkdir(dirname(dest), { recursive: true })
      await copyFile(src, dest)
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn('Could not copy favicon.ico:', err)
      }
    }
  }
}

export async function getBlogCSS() {
  const cssPath = join(projectRoot, 'src', 'styles', 'blog.css')
  return await readFile(cssPath, 'utf-8')
}

export async function copyAssets(sourceDir, destDir) {
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
    if (error.code !== 'ENOENT') {
      console.warn(`Warning: Could not copy assets: ${error.message}`)
    }
  }
}

export function googleFontsHeadHtml() {
  return `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap" rel="stylesheet">`
}

export function themeInitScriptHtml() {
  return `  <script>
    (function() {
      var stored = localStorage.getItem('darkMode');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (stored === 'true' || (stored === null && prefersDark)) {
        document.documentElement.classList.add('dark');
      }
    })();
  </script>`
}

export function standaloneTopbarHtml(backHref = '/') {
  return `    <nav class="standalone-topbar" aria-label="Site navigation">
      <a href="${escapeHtml(backHref)}" class="standalone-back">← Reuben Peter-Paul</a>
      <button type="button" id="theme-toggle" class="theme-toggle" aria-label="Toggle color theme">
        <span aria-hidden="true">◐</span>
        <span>Theme</span>
      </button>
    </nav>`
}

export function themeToggleScriptHtml() {
  return `  <script>
    (function() {
      var btn = document.getElementById('theme-toggle');
      if (!btn) return;
      function syncLabel() {
        var isDark = document.documentElement.classList.contains('dark');
        btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      }
      syncLabel();
      btn.addEventListener('click', function() {
        var isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('darkMode', isDark ? 'true' : 'false');
        syncLabel();
      });
    })();
  </script>`
}

export function entryFooterHtml() {
  return `    <footer class="entry-footer">
      <p>
        Have a note or counterpoint? Reply on <a href="https://www.linkedin.com/in/reubenpeterpaul/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        or by <a href="mailto:reuben.peterpaul@protonmail.com">email</a>.
      </p>
      <div class="entry-footer-links">
        <a href="/feed.xml">RSS</a>
        <span class="entry-footer-sep" aria-hidden="true">·</span>
        <a href="https://github.com/scaryponens" target="_blank" rel="noopener noreferrer">GitHub</a>
        <span class="entry-footer-sep" aria-hidden="true">·</span>
        <a href="https://www.linkedin.com/in/reubenpeterpaul/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <span class="entry-footer-sep" aria-hidden="true">·</span>
        <a href="mailto:reuben.peterpaul@protonmail.com">Email</a>
      </div>
    </footer>`
}
