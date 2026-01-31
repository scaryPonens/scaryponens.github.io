import { useState, useEffect } from 'react'

function BlogList() {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch blog manifest
    fetch('/blog/manifest.json')
      .then(res => res.json())
      .then(data => {
        setBlogs(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading blog manifest:', err)
        setLoading(false)
      })
  }, [])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  if (loading) {
    return (
      <section className="blog-section">
        <div className="section-container">
          <h2 className="section-title">
            <span className="neon-text">[ BLOG ]</span>
          </h2>
          <div className="retro-panel">
            <p className="retro-text">Loading articles...</p>
          </div>
        </div>
      </section>
    )
  }

  if (blogs.length === 0) {
    return (
      <section className="blog-section">
        <div className="section-container">
          <h2 className="section-title">
            <span className="neon-text">[ BLOG ]</span>
          </h2>
          <div className="retro-panel">
            <p className="retro-text">No articles yet. Check back soon!</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="blog-section">
      <div className="section-container">
        <h2 className="section-title">
          <span className="neon-text">[ BLOG ]</span>
        </h2>
        <div className="blog-list">
          {blogs.map((blog, index) => (
            <a 
              key={index} 
              href={`/blog/${blog.filename}`}
              className="blog-card"
            >
              <div className="card-border"></div>
              <h3 className="blog-title">{blog.title}</h3>
              <p className="blog-date">{formatDate(blog.date)}</p>
              <p className="blog-excerpt">{blog.excerpt}</p>
              <div className="blog-link">
                <span className="neon-text">Read more →</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BlogList
