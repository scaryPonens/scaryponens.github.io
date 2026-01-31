import { useState, useEffect } from 'react'

function BlogList() {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/blog/manifest.json')
      .then(res => res.json())
      .then(data => {
        // Sort by date descending (newest first)
        const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date))
        setBlogs(sorted)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading blog manifest:', err)
        setLoading(false)
      })
  }, [])

  const formatDate = (dateString) => {
    // Parse date string as local date to avoid timezone issues
    // dateString format: "YYYY-MM-DD"
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day) // month is 0-indexed
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  if (loading || blogs.length === 0) {
    return null
  }

  return (
    <section className="blog-section">
      <div className="section-container">
        <h2 className="section-title">Writing</h2>
        <div className="blog-list">
          {blogs.map((blog, index) => (
            <a 
              key={index} 
              href={`/blog/${blog.filename}`}
              className="blog-card"
            >
              <h3 className="blog-title">{blog.title}</h3>
              <span className="blog-date">{formatDate(blog.date)}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BlogList
