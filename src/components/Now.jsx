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

  const kicker = nowData.updated
    ? `01 / NOW — UPDATED ${nowData.updated.toUpperCase()}`
    : '01 / NOW'

  return (
    <>
      <hr className="section-rule" />
      <section className="editorial-section" id="now" aria-labelledby="now-heading">
        <p className="section-kicker">{kicker}</p>
        <h2 id="now-heading" className="section-heading">What is on the bench.</h2>
        <div
          className="now-body"
          dangerouslySetInnerHTML={{ __html: nowData.bodyHtml }}
        />
      </section>
    </>
  )
}

export default Now
