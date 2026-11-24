import { useState, useEffect } from 'react'

function BlogList() {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/blog/manifest.json')
      .then(res => res.json())
      .then(data => {
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
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
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
    <section className="blog-section" id="field-notes">
      <div className="section-container">
        <h2 className="section-title">Field Notes</h2>
        <div className="blog-list">
          {blogs.map((blog, index) => (
            <a
              key={blog.slug || index}
              href={blog.external_url || `/blog/${blog.filename}`}
              className="blog-card"
              {...(blog.external_url && { target: '_blank', rel: 'noopener noreferrer' })}
            >
              <h3 className="blog-title">
                {blog.title}
                {blog.external_url && (
                  <i className="fa-solid fa-arrow-up-right-from-square external-inline-icon" aria-hidden="true"></i>
                )}
              </h3>
              <span className="blog-date">{formatDate(blog.date)}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BlogList
