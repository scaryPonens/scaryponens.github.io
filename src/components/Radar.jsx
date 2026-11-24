import { useState, useEffect } from 'react'

function Radar() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedSlug, setCopiedSlug] = useState(null)

  useEffect(() => {
    fetch(`/radar/manifest.json?v=${__BUILD_ID__}`)
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
    <>
      <hr className="section-rule" />
      <section className="editorial-section" id="worth-looking-at" aria-labelledby="radar-heading">
        <p className="section-kicker">02 / WORTH LOOKING AT</p>
        <h2 id="radar-heading" className="section-heading">Curated radar &amp; short whys.</h2>
        <div className="radar-list">
          {items.map((item) => {
            const isCopied = copiedSlug === item.slug
            const isInternal = Boolean(item.url && item.url.startsWith('/'))
            return (
              <article key={item.slug} id={item.anchor} className="radar-item">
                <div className="radar-item-header">
                  {item.url ? (
                    <a
                      href={item.url}
                      {...(!isInternal && { target: '_blank', rel: 'noopener noreferrer' })}
                      className="radar-title"
                    >
                      {item.title}
                      <span className="ext-arrow" aria-hidden="true">{isInternal ? '→' : '↗'}</span>
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

                {Array.isArray(item.bots) && item.bots.length > 0 && (
                  <div className="radar-chips">
                    {item.bots.map((bot) => (
                      <div key={bot.name} className="radar-chip">
                        <img
                          src={bot.avatar}
                          alt={`${bot.name} bot avatar`}
                          width={34}
                          height={34}
                        />
                        <div>
                          <span className="radar-chip-name">{bot.name}</span>
                          {bot.role && (
                            <span className="radar-chip-role">{bot.role}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="radar-meta">
                  <div className="radar-meta-left">
                    <a
                      href={item.permalink}
                      className="radar-date-link"
                      title="Permalink"
                    >
                      <time dateTime={item.date}>{item.date}</time>
                    </a>
                    {item.tags && item.tags.length > 0 && (
                      <>
                        <span className="radar-meta-sep" aria-hidden="true">·</span>
                        <span className="radar-tags-inline">{item.tags.join(', ')}</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`radar-copy-btn${isCopied ? ' copied' : ''}`}
                    onClick={() => handleCopyLink(item)}
                    aria-label={`Copy shareable link for ${item.title}`}
                  >
                    {isCopied ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}

export default Radar
