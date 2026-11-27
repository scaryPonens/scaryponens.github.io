import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exec } from 'child_process'
import { createHash } from 'crypto'
import { readdir, readFile } from 'fs/promises'
import { promisify } from 'util'
import { basename, resolve, sep } from 'path'

const execAsync = promisify(exec)

const CONTENT_SCRIPTS = [
  'node scripts/build-thoughts.js',
  'node scripts/build-projects.js',
  'node scripts/build-radar.js',
  'node scripts/build-now.js',
  'node scripts/build-feed.js'
]

function buildContentPlugin() {
  let builtOnce = false
  let running = null

  const runContentBuild = async () => {
    if (running) return running
    running = (async () => {
      for (const cmd of CONTENT_SCRIPTS) {
        const { stdout, stderr } = await execAsync(cmd)
        if (stdout) console.log(stdout.trim())
        if (stderr) console.error(stderr.trim())
      }
      builtOnce = true
    })().finally(() => {
      running = null
    })
    return running
  }

  return {
    name: 'build-content',
    async configureServer(server) {
      await runContentBuild()

      const watchPaths = [
        resolve('thoughts'),
        resolve('projects'),
        resolve('radar'),
        resolve('now.md')
      ]
      server.watcher.add(watchPaths)

      const onChange = async (file) => {
        if (watchPaths.some(p => file === p || file.startsWith(p + '/'))) {
          try {
            await runContentBuild()
            server.ws.send({ type: 'full-reload' })
          } catch (error) {
            console.error('Error rebuilding content:', error.message)
          }
        }
      }

      server.watcher.on('change', onChange)
      server.watcher.on('add', onChange)
      server.watcher.on('unlink', onChange)
    },
    async buildStart() {
      // `npm run build` already runs `npm run build:content` before `vite build`.
      // Run here only if `vite build` was invoked directly without npm build.
      if (!builtOnce && process.env.npm_lifecycle_event !== 'build') {
        await runContentBuild()
      }
    }
  }
}

const THOUGHT_DEV_RELOAD_SNIPPET = `
  <script data-thought-dev-reload>
    (function() {
      if (typeof EventSource === 'undefined') return;
      var es = new EventSource('/__thought-reload');
      es.onmessage = function(ev) {
        try {
          var msg = JSON.parse(ev.data);
          if (!msg.slug || msg.slug === '*' || location.pathname.endsWith('/' + msg.slug + '.html')) {
            location.reload();
          }
        } catch (e) {
          location.reload();
        }
      };
    })();
  </script>
`

function hashText(str) {
  return createHash('sha1').update(str).digest('hex')
}

async function readBlogHtmlWithRetry(filePath, retries = 8, delayMs = 25) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await readFile(filePath, 'utf-8')
    } catch (err) {
      if (err.code !== 'ENOENT' || attempt === retries) throw err
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
  return null
}

function thoughtLiveReloadPlugin() {
  return {
    name: 'thought-live-reload',
    apply: 'serve',
    async configureServer(server) {
      const publicBlogDir = resolve('public', 'blog')
      const sseClients = new Set()
      const lastHashBySlug = new Map()
      const pendingTimers = new Map()

      try {
        const files = await readdir(publicBlogDir)
        await Promise.all(
          files
            .filter(f => f.endsWith('.html'))
            .map(async f => {
              const html = await readFile(resolve(publicBlogDir, f), 'utf-8')
              lastHashBySlug.set(basename(f, '.html'), hashText(html))
            })
        )
      } catch {
        // public/blog may not exist yet before first content build
      }

      server.watcher.add(publicBlogDir)

      const notifySlugChange = (file) => {
        if (!file.startsWith(publicBlogDir + sep) || !file.endsWith('.html')) return
        const slug = basename(file, '.html')
        if (pendingTimers.has(slug)) clearTimeout(pendingTimers.get(slug))
        pendingTimers.set(
          slug,
          setTimeout(async () => {
            pendingTimers.delete(slug)
            try {
              const html = await readFile(file, 'utf-8')
              const nextHash = hashText(html)
              if (lastHashBySlug.get(slug) === nextHash) return
              lastHashBySlug.set(slug, nextHash)

              const payload = `data: ${JSON.stringify({ type: 'reload', slug, ts: Date.now() })}\n\n`
              for (const client of sseClients) {
                client.write(payload)
              }
              server.ws.send({ type: 'full-reload' })
            } catch {
              // Ignore transient ENOENT while build-thoughts recreates public/blog
            }
          }, 35)
        )
      }

      server.watcher.on('change', notifySlugChange)
      server.watcher.on('add', notifySlugChange)

      server.httpServer?.once('close', () => {
        for (const timer of pendingTimers.values()) clearTimeout(timer)
        pendingTimers.clear()
        for (const client of sseClients) client.end()
        sseClients.clear()
      })

      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next()
        const pathname = req.url.split('?')[0].split('#')[0]

        if (pathname === '/__thought-reload') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive'
          })
          res.write(': connected\n\n')
          sseClients.add(res)
          req.on('close', () => sseClients.delete(res))
          return
        }

        if (req.method !== 'GET' && req.method !== 'HEAD') return next()
        const match = pathname.match(/^\/blog\/([^/]+)\.html$/)
        if (!match) return next()

        const slug = decodeURIComponent(match[1])
        const targetFile = resolve(publicBlogDir, `${slug}.html`)
        if (!targetFile.startsWith(publicBlogDir + sep)) return next()

        try {
          const rawHtml = await readBlogHtmlWithRetry(targetFile)
          lastHashBySlug.set(slug, hashText(rawHtml))
          const closeBodyIdx = rawHtml.lastIndexOf('</body>')
          const injectedHtml =
            closeBodyIdx !== -1
              ? rawHtml.slice(0, closeBodyIdx) + THOUGHT_DEV_RELOAD_SNIPPET + rawHtml.slice(closeBodyIdx)
              : rawHtml + THOUGHT_DEV_RELOAD_SNIPPET

          res.statusCode = 200
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(req.method === 'HEAD' ? undefined : injectedHtml)
        } catch (err) {
          if (err.code === 'ENOENT') return next()
          next(err)
        }
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [buildContentPlugin(), thoughtLiveReloadPlugin(), react()],
  base: '/',
  define: {
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three-core'
          }
        },
      },
    },
  },
})
