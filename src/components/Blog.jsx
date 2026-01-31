import { useMemo } from 'react'
import { loadBlogPosts, formatDate, createSlug } from '../utils/blogUtils'
import './Blog.css'

function Blog() {
  // Load and parse blog posts
  const posts = useMemo(() => {
    try {
      const loadedPosts = loadBlogPosts()
      console.log('Blog posts loaded:', loadedPosts.length, loadedPosts)
      return loadedPosts
    } catch (error) {
      console.error('Error loading blog posts:', error)
      return []
    }
  }, [])

  if (posts.length === 0) {
    return null // Don't show blog section if no posts
  }

  return (
    <section className="blog-section">
      <div className="section-container">
        <h2 className="section-title">
          <span className="neon-text">[ THOUGHTS ]</span>
        </h2>
        <div className="blog-posts">
          {posts.map((post) => {
            const slug = createSlug(post.filename)
            return (
              <a 
                key={post.filename} 
                href={`/blog/${slug}.html`}
                className="blog-post-link"
              >
                <div className="blog-post">
                  <div className="blog-header">
                    <span className="blog-date">[{formatDate(post.date)}]</span>
                    <span className="blog-title">{post.title}</span>
                    <span className="blog-toggle">→</span>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Blog
