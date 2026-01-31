import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Plugin to build markdown files after Vite build and during dev
function buildThoughtsPlugin() {
  let manifestGenerated = false
  
  const runBuildScript = async () => {
    if (manifestGenerated) return
    try {
      const { stdout, stderr } = await execAsync('node scripts/build-thoughts.js')
      if (stdout) console.log(stdout)
      if (stderr) console.error(stderr)
      manifestGenerated = true
    } catch (error) {
      console.error('Error running build-thoughts script:', error.message)
    }
  }

  return {
    name: 'build-thoughts',
    async configureServer() {
      // Generate manifest and HTML files on dev server start
      // Files will be in public/blog/ and served automatically by Vite
      // Await to ensure manifest is ready before server starts accepting requests
      await runBuildScript()
    },
    buildEnd: async () => {
      await runBuildScript()
    }
  }
}

// Plugin to build project markdown files after Vite build and during dev
function buildProjectsPlugin() {
  let manifestGenerated = false
  
  const runBuildScript = async () => {
    if (manifestGenerated) return
    try {
      const { stdout, stderr } = await execAsync('node scripts/build-projects.js')
      if (stdout) console.log(stdout)
      if (stderr) console.error(stderr)
      manifestGenerated = true
    } catch (error) {
      console.error('Error running build-projects script:', error.message)
    }
  }

  return {
    name: 'build-projects',
    async configureServer() {
      // Generate manifest and HTML files on dev server start
      // Files will be in public/projects/ and served automatically by Vite
      // Await to ensure manifest is ready before server starts accepting requests
      await runBuildScript()
    },
    buildEnd: async () => {
      await runBuildScript()
    }
  }
}

// https://vitejs.dev/config/
// For GitHub Pages user/organization sites (username.github.io), use base: '/'
// For project sites, use base: '/repo-name/'
export default defineConfig({
  plugins: [buildThoughtsPlugin(), buildProjectsPlugin(), react()],
  base: '/',
})
