import { useState, useEffect } from 'react'

function Radar() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedSlug, setCopiedSlug] = useState(null)

  useEffect(() => {
    fetch('/radar/manifest.json')
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        setItems(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading radar manifest:', err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (loading || items.length === 0) return
    const hash = window.location.hash
    if (hash && hash.startsWith('#radar-')) {
      const target = document.getElementById(hash.slice(1))
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [loading, items])

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleCopyLink = async (item) => {
    const shareUrl = `${window.location.origin}${item.permalink}`
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const input = document.createElement('textarea')
        input.value = shareUrl
        input.setAttribute('readonly', '')
        input.style.position = 'absolute'
        input.style.left = '-9999px'
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
      setCopiedSlug(item.slug)
      setTimeout(() => {
        setCopiedSlug(current => (current === item.slug ? null : current))
      }, 1800)
    } catch (err) {
      console.error('Could not copy link:', err)
    }
  }

  if (loading || items.length === 0) {
    return null
  }

  return (
    <section className="radar-section" id="worth-looking-at">
      <div className="section-container">
        <div className="section-header-row">
          <h2 className="section-title">Worth Looking At</h2>
          <a href="/feed.xml" className="section-rss-link" title="Subscribe via RSS">
            <i className="fa-solid fa-rss" aria-hidden="true"></i>
            <span>RSS</span>
          </a>
        </div>
        <div className="radar-list">
          {items.map((item) => {
            const isCopied = copiedSlug === item.slug
            return (
              <article key={item.slug} id={item.anchor} className="radar-item">
                <div className="radar-item-header">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="radar-title"
                    >
                      <span>{item.title}</span>
                      <i className="fa-solid fa-arrow-up-right-from-square radar-external-icon" aria-hidden="true"></i>
                    </a>
                  ) : (
                    <h3 className="radar-title-plain">{item.title}</h3>
                  )}
                  {item.source && (
                    <span className="radar-source">{item.source}</span>
                  )}
                </div>

                {item.bodyHtml && (
                  <div
                    className="radar-note"
                    dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
                  />
                )}

                <div className="radar-meta">
                  <div className="radar-meta-left">
                    <time className="radar-date" dateTime={item.date}>
                      {formatDate(item.date)}
                    </time>
                    {item.tags && item.tags.length > 0 && (
                      <div className="radar-tags">
                        {item.tags.map((tag) => (
                          <span key={tag} className="radar-tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="radar-actions">
                    <a
                      href={`#${item.anchor}`}
                      className="radar-action-link"
                      title="Section anchor"
                      aria-label={`Anchor link for ${item.title}`}
                    >
                      #
                    </a>
                    <a
                      href={item.permalink}
                      className="radar-action-link"
                      title="Open standalone permalink page"
                      aria-label={`Permalink page for ${item.title}`}
                    >
                      <i className="fa-solid fa-link" aria-hidden="true"></i>
                    </a>
                    <button
                      type="button"
                      className={`radar-copy-btn${isCopied ? ' copied' : ''}`}
                      onClick={() => handleCopyLink(item)}
                      title="Copy shareable link"
                      aria-label={`Copy shareable link for ${item.title}`}
                    >
                      <i className={isCopied ? 'fa-solid fa-check' : 'fa-regular fa-copy'} aria-hidden="true"></i>
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Radar
