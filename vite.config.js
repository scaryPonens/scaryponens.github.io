import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exec } from 'child_process'
import { promisify } from 'util'
import { resolve } from 'path'

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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [buildContentPlugin(), react()],
  base: '/',
  define: {
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
})
