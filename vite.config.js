import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import markdownRaw from './plugins/vite-plugin-markdown-raw.js'

// https://vitejs.dev/config/
// For GitHub Pages user/organization sites (username.github.io), use base: '/'
// For project sites, use base: '/repo-name/'
export default defineConfig({
  plugins: [markdownRaw(), react()], // Markdown plugin first so it transforms before React
  base: '/',
})
