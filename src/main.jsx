import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/main.css'

// Read blog post data BEFORE React mounts to preserve it
// React may replace the root element during hydration, losing the data attribute
const rootElement = document.getElementById('root')
const blogPostData = rootElement?.getAttribute('data-blog-post')

if (blogPostData) {
  try {
    // Store in window before React mounts
    window.__BLOG_POST_DATA__ = JSON.parse(blogPostData)
    console.log('[Main] Preserved blog post data:', window.__BLOG_POST_DATA__.title)
  } catch (e) {
    console.error('[Main] Failed to parse blog post data:', e)
  }
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
