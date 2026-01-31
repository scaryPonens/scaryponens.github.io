import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './Blog.css'

function BlogPost() {
  // Parse post data - prioritize data attribute since it's definitely in the HTML
  const [post, setPost] = useState(() => {
    if (typeof document === 'undefined') return null
    
    // First try: data attribute on root element (most reliable - it's in the HTML)
    const root = document.getElementById('root')
    if (root) {
      const postData = root.getAttribute('data-blog-post')
      console.log('BlogPost: Checking data attribute - found:', !!postData)
      
      if (postData) {
        try {
          const parsed = JSON.parse(postData)
          console.log('BlogPost: Parsed from data attribute successfully:', parsed.title)
          return parsed
        } catch (e) {
          console.error('BlogPost: Failed to parse data attribute:', e)
          console.error('BlogPost: Raw data (first 200 chars):', postData.substring(0, 200))
        }
      } else {
        console.warn('BlogPost: No data-blog-post attribute found on root')
        console.log('BlogPost: Root attributes:', Array.from(root.attributes).map(a => `${a.name}="${a.value.substring(0, 50)}..."`))
      }
    } else {
      console.error('BlogPost: Root element not found!')
    }
    
    // Second try: window variable (fallback)
    if (typeof window !== 'undefined' && window.__BLOG_POST_DATA__) {
      console.log('BlogPost: Found data in window.__BLOG_POST_DATA__', window.__BLOG_POST_DATA__.title)
      return window.__BLOG_POST_DATA__
    }
    
    console.warn('BlogPost: No post data found from any source')
    return null
  })
  
  // Try again in useEffect in case of timing issues
  useEffect(() => {
    if (!post && typeof window !== 'undefined') {
      // Check window variable
      if (window.__BLOG_POST_DATA__) {
        console.log('BlogPost: useEffect found window data', window.__BLOG_POST_DATA__.title)
        setPost(window.__BLOG_POST_DATA__)
        return
      }
      
      // Check data attribute
      const root = document.getElementById('root')
      const postData = root?.getAttribute('data-blog-post')
      
      console.log('BlogPost: useEffect check - postData found:', !!postData)
      
      if (postData) {
        try {
          const parsed = JSON.parse(postData)
          console.log('BlogPost: useEffect parsed successfully', parsed.title)
          setPost(parsed)
        } catch (e) {
          console.error('BlogPost: useEffect failed to parse:', e)
        }
      }
    }
  }, [post])

  if (!post) {
    // Show loading state while parsing, or error if data is missing
    return (
      <div className="retro-panel">
        <h1 className="neon-text">Loading...</h1>
        <p className="retro-text">Loading blog post...</p>
      </div>
    )
  }

  return (
    <div className="blog-post-page">
      <a href="/" className="blog-back-link">
        <span className="button-icon">←</span>
        <span className="button-text">Back to Home</span>
      </a>
      
      <article className="blog-post-full">
        <header className="blog-post-header-full">
          <span className="blog-date">[{post.date}]</span>
          <h1 className="blog-post-title-full">{post.title}</h1>
        </header>
        
        <div className="blog-content-full">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({node, ...props}) => <h1 className="blog-markdown-h1" {...props} />,
              h2: ({node, ...props}) => <h2 className="blog-markdown-h2" {...props} />,
              h3: ({node, ...props}) => <h3 className="blog-markdown-h3" {...props} />,
              p: ({node, ...props}) => <p className="blog-markdown-p" {...props} />,
              a: ({node, ...props}) => <a className="blog-markdown-a" {...props} />,
              code: ({node, inline, ...props}) => 
                inline ? (
                  <code className="blog-markdown-code-inline" {...props} />
                ) : (
                  <code className="blog-markdown-code-block" {...props} />
                ),
              pre: ({node, ...props}) => <pre className="blog-markdown-pre" {...props} />,
              ul: ({node, ...props}) => <ul className="blog-markdown-ul" {...props} />,
              ol: ({node, ...props}) => <ol className="blog-markdown-ol" {...props} />,
              li: ({node, ...props}) => <li className="blog-markdown-li" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="blog-markdown-blockquote" {...props} />,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  )
}

export default BlogPost
