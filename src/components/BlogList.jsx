import { useState, useEffect } from 'react'

function BlogList() {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BlogList
