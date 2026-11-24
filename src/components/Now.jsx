import { useState, useEffect } from 'react'

function Now() {
  const [nowData, setNowData] = useState(null)

  useEffect(() => {
    fetch('/now.json')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.bodyHtml) {
          setNowData(data)
        }
      })
      .catch(err => {
        console.error('Error loading now.json:', err)
      })
  }, [])

  if (!nowData) {
    return null
  }

  return (
    <section className="now-section" aria-labelledby="now-heading">
      <div className="section-container">
        <div className="now-box">
          <div className="now-header">
            <h2 id="now-heading" className="now-title">{nowData.title || 'Now'}</h2>
            {nowData.updated && (
              <span className="now-updated">Updated {nowData.updated}</span>
            )}
          </div>
          <div
            className="now-body"
            dangerouslySetInnerHTML={{ __html: nowData.bodyHtml }}
          />
        </div>
      </div>
    </section>
  )
}

export default Now
