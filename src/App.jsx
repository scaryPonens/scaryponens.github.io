import { useState, useEffect } from 'react'
import Header from './components/Header'
import About from './components/About'
import Projects from './components/Projects'
import Blog from './components/Blog'
import BlogPost from './components/BlogPost'
import Contact from './components/Contact'
import './styles/components.css'

function App() {
  // Check if we're on a blog post page
  // Check window variable, data attribute, and URL path
  const [isBlogPost, setIsBlogPost] = useState(() => {
    if (typeof window === 'undefined') return false
    
    // Check window variable first (most reliable, set before React loads)
    const hasWindowData = !!window.__BLOG_POST_DATA__
    
    // Check data attribute
    const root = document.getElementById('root')
    const hasDataAttr = root?.hasAttribute('data-blog-post')
    
    // Check URL path as fallback
    const path = window.location.pathname
    const isBlogPath = path.includes('/blog/') && path.endsWith('.html')
    
    const result = hasWindowData || hasDataAttr || isBlogPath
    console.log('App: Checking for blog post:', {
      hasWindowData,
      hasDataAttr,
      isBlogPath,
      path,
      result
    })
    return result
  })
  
  // Double-check on mount in case of timing issues
  useEffect(() => {
    const hasWindowData = !!window.__BLOG_POST_DATA__
    const root = document.getElementById('root')
    const hasDataAttr = root?.hasAttribute('data-blog-post')
    const path = window.location.pathname
    const isBlogPath = path.includes('/blog/') && path.endsWith('.html')
    
    if ((hasWindowData || hasDataAttr || isBlogPath) && !isBlogPost) {
      console.log('App: Updating isBlogPost to true')
      setIsBlogPost(true)
    }
  }, [isBlogPost])

  return (
    <div className="app">
      <div className="crt-screen">
        <div className="scanlines"></div>
        <div className="content">
          {isBlogPost ? (
            <BlogPost />
          ) : (
            <>
              <Header />
              <About />
              {/* <Projects /> */}
              <Blog />
              <Contact />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
