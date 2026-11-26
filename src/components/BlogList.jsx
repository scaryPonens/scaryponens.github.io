import { useState, useEffect } from 'react'

function BlogList() {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/blog/manifest.json?v=${__BUILD_ID__}`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => b.date.localeCompare(a.date))
          : []
        setBlogs(sorted)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading blog manifest:', err)
        setLoading(false)
      })
  }, [])

  return (
    <>
      <hr className="section-rule" />
      <section className="editorial-section" id="field-notes" aria-labelledby="field-notes-heading">
        <p className="section-kicker">02 / FIELD NOTES</p>
        <h2 id="field-notes-heading" className="section-heading">Longer arguments &amp; lessons.</h2>
        {!loading && blogs.length === 0 ? (
          <p className="empty-state">wow, such empty.</p>
        ) : (
          <div className="notes-index">
            {blogs.map((blog, index) => (
              <a
                key={blog.slug || index}
                href={blog.external_url || `/blog/${blog.filename}`}
                className="note-row"
                {...(blog.external_url && { target: '_blank', rel: 'noopener noreferrer' })}
              >
                <time className="note-date" dateTime={blog.date}>{blog.date}</time>
                <span className="note-title">
                  {blog.title}
                  {blog.external_url && (
                    <span className="ext-arrow" aria-hidden="true">↗</span>
                  )}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

export default BlogList
