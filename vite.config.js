import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// For GitHub Pages user/organization sites (username.github.io), use base: '/'
// For project sites, use base: '/repo-name/'
export default defineConfig({
  plugins: [react()],
  base: '/',
})
