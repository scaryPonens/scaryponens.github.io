import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import DarkModeToggle from './DarkModeToggle'
import '../styles/hero.css'

const Hero3DCanvas = lazy(() => import('./Hero3DCanvas'))

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function OrcaLogoSvg() {
  return (
    <svg viewBox="2.8 4 19 15.5" fill="currentColor" aria-hidden="true" className="floating-tool-svg">
      <path d="M3.4 16.9c1.2-1.2 2.4-1.3 4.2-1 1.7.3 3.3-.2 4.3-1.4L14.2 5.4c.12-.45.55-.38.46.08l-1.95 9.95c-.12.6-.55.98-1.18 1.12-2.6.58-5.7.68-8.13.35Z" />
      <path d="M12.1 18.8 14.3 11.4c.85-2.85 3.45-4.55 6.85-4.35.42.02.52.42.18.68-1.15.88-2.45 1.55-3.85 2.15-1.55.66-2.65 1.95-3.55 4.25l-1.42 4.72c-.12.38-.52.32-.41-.05Z" />
      <ellipse cx="17.1" cy="5.2" rx="1.75" ry="0.72" transform="rotate(-10 17.1 5.2)" />
    </svg>
  )
}

function PiLogoSvg() {
  return (
    <svg
      viewBox="0 0 4 4"
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
      className="floating-tool-svg"
    >
      <rect x="0" y="0" width="3" height="1" opacity="1" />
      <rect x="2" y="1" width="1" height="1" opacity="1" />
      <rect x="0" y="1" width="1" height="3" opacity="0.6" />
      <rect x="1" y="2" width="1" height="1" opacity="0.6" />
      <rect x="3" y="2" width="1" height="2" opacity="0.8" />
    </svg>
  )
}

function ObsidianLogoSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="floating-tool-svg">
      <path d="M19.355 18.538a68.967 68.959 0 0 0 1.858-2.954.81.81 0 0 0-.062-.9c-.516-.685-1.504-2.075-2.042-3.362-.553-1.321-.636-3.375-.64-4.377a1.707 1.707 0 0 0-.358-1.05l-3.198-4.064a3.744 3.744 0 0 1-.076.543c-.106.503-.307 1.004-.536 1.5-.134.29-.29.6-.446.914l-.31.626c-.516 1.068-.997 2.227-1.132 3.59-.124 1.26.046 2.73.815 4.481.128.011.257.025.386.044a6.363 6.363 0 0 1 3.326 1.505c.916.79 1.744 1.922 2.415 3.5zM8.199 22.569c.073.012.146.02.22.02.78.024 2.095.092 3.16.29.87.16 2.593.64 4.01 1.055 1.083.316 2.198-.548 2.355-1.664.114-.814.33-1.735.725-2.58l-.01.005c-.67-1.87-1.522-3.078-2.416-3.849a5.295 5.295 0 0 0-2.778-1.257c-1.54-.216-2.952.19-3.84.45.532 2.218.368 4.829-1.425 7.531zM5.533 9.938c-.023.1-.056.197-.098.29L2.82 16.059a1.602 1.602 0 0 0 .313 1.772l4.116 4.24c2.103-3.101 1.796-6.02.836-8.3-.728-1.73-1.832-3.081-2.55-3.831zM9.32 14.01c.615-.183 1.606-.465 2.745-.534-.683-1.725-.848-3.233-.716-4.577.154-1.552.7-2.847 1.235-3.95.113-.235.223-.454.328-.664.149-.297.288-.577.419-.86.217-.47.379-.885.46-1.27.08-.38.08-.72-.014-1.043-.095-.325-.297-.675-.68-1.06a1.6 1.6 0 0 0-1.475.36l-4.95 4.452a1.602 1.602 0 0 0-.513.952l-.427 2.83c.672.59 2.328 2.316 3.335 4.711.09.21.175.43.253.653z" />
    </svg>
  )
}

function AntigravityLogoSvg() {
  return (
    <svg viewBox="13 17 86 81" fill="currentColor" aria-hidden="true" className="floating-tool-svg">
      <path d="M89.6992 93.695C94.3659 97.195 101.366 94.8617 94.9492 88.445C75.6992 69.7783 79.7825 18.445 55.8659 18.445C31.9492 18.445 36.0325 69.7783 16.7825 88.445C9.78251 95.445 17.3658 97.195 22.0325 93.695C40.1159 81.445 38.9492 59.8617 55.8659 59.8617C72.7825 59.8617 71.6159 81.445 89.6992 93.695Z" />
    </svg>
  )
}

function FieldNotesIconSvg() {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="desktop-glyph-svg"
    >
      <path d="M7 4.5h11.5L22.5 8.5v15H7z" />
      <path d="M18.5 4.5v4h4" />
      <path d="M5 8.5h2M5 14h2M5 19.5h2" />
      <path d="M10.5 12.5h8M10.5 16h8M10.5 19.5h5" />
    </svg>
  )
}

function CuratedRadarIconSvg() {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="desktop-glyph-svg"
    >
      <circle cx="14" cy="14" r="9.5" />
      <circle cx="14" cy="14" r="5.2" strokeOpacity="0.65" />
      <path d="M14 4.5v3M14 20.5v3M4.5 14h3M20.5 14h3" strokeOpacity="0.65" />
      <path d="M14 14l6.4-6.4" />
      <circle cx="18.2" cy="9.8" r="1.45" fill="currentColor" stroke="none" />
      <circle cx="14" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function Hero3D() {
  const runwayRef = useRef(null)
  const act1OverlayRef = useRef(null)
  const scrollCueRef = useRef(null)
  const monitorOverlayRef = useRef(null)
  const act2CaptionRef = useRef(null)

  const [webglReady, setWebglReady] = useState(false)
  const [webglFallback, setWebglFallback] = useState(false)
  const [isDeskActive, setIsDeskActive] = useState(false)
  const isDeskActiveRef = useRef(false)

  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const applyProgressToDom = useCallback((p, screenBox) => {
    // Act 1 editorial panel: crisp at p=0, lifts & fades out cleanly over [0.28, 0.45]
    if (act1OverlayRef.current) {
      const fade = clamp(1 - (p - 0.28) / 0.17, 0, 1)
      act1OverlayRef.current.style.opacity = String(fade)
      act1OverlayRef.current.style.transform = `translate3d(0, ${((1 - fade) * -22).toFixed(1)}px, 0)`
      act1OverlayRef.current.style.pointerEvents = fade > 0.15 ? 'auto' : 'none'
    }

    // Quiet Scroll ↓ cue: fades out quickly as soon as scroll starts
    if (scrollCueRef.current) {
      const cueOpacity = clamp(1 - p / 0.075, 0, 1)
      scrollCueRef.current.style.opacity = String(cueOpacity)
    }

    // Act 2 49" Curved-Monitor HTML/SVG desktop overlay
    const deskVisible = p >= 0.54
    if (deskVisible !== isDeskActiveRef.current) {
      isDeskActiveRef.current = deskVisible
      setIsDeskActive(deskVisible)
    }

    if (monitorOverlayRef.current) {
      const screenOpacity = clamp((p - 0.54) / 0.17, 0, 1)
      monitorOverlayRef.current.style.opacity = String(screenOpacity)

      if (screenBox && screenBox.width > 10 && screenBox.height > 10) {
        monitorOverlayRef.current.style.left = `${screenBox.left.toFixed(1)}px`
        monitorOverlayRef.current.style.top = `${screenBox.top.toFixed(1)}px`
        monitorOverlayRef.current.style.width = `${screenBox.width.toFixed(1)}px`
        monitorOverlayRef.current.style.height = `${screenBox.height.toFixed(1)}px`
      }
    }

    if (act2CaptionRef.current) {
      const capOpacity = clamp((p - 0.64) / 0.14, 0, 1)
      act2CaptionRef.current.style.opacity = String(capOpacity)
    }
  }, [])

  // Fallback scroll sync before lazy WebGL mounts or when WebGL is unavailable
  useEffect(() => {
    if (webglReady && !webglFallback) return undefined

    const updateFallbackScroll = () => {
      const runway = runwayRef.current
      if (!runway) return
      const rect = runway.getBoundingClientRect()
      const vh = window.innerHeight || 800
      const vw = window.innerWidth || 1200
      const maxScroll = Math.max(1, runway.offsetHeight - vh)
      const p = clamp(-rect.top / maxScroll, 0, 1)

      const boxW = Math.min(vw * 0.88, 920)
      const boxH = Math.max(110, Math.min(boxW * 0.3, 280))
      applyProgressToDom(p, {
        left: (vw - boxW) / 2,
        top: (vh - boxH) * 0.46,
        width: boxW,
        height: boxH,
      })
    }

    updateFallbackScroll()
    window.addEventListener('scroll', updateFallbackScroll, { passive: true })
    window.addEventListener('resize', updateFallbackScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateFallbackScroll)
      window.removeEventListener('resize', updateFallbackScroll)
    }
  }, [webglReady, webglFallback, applyProgressToDom])

  const handleReady = useCallback(() => {
    setWebglReady(true)
  }, [])

  const handleFallback = useCallback((failed) => {
    setWebglFallback(Boolean(failed))
  }, [])

  const handleSmoothSectionJump = useCallback(
    (targetId) => (e) => {
      const el = document.getElementById(targetId)
      if (!el) return
      e.preventDefault()
      el.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      })
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', `#${targetId}`)
      }
    },
    [reducedMotion]
  )

  return (
    <section
      ref={runwayRef}
      className={`hero-runway${reducedMotion ? ' is-reduced-motion' : ''}`}
      aria-label="Introduction"
    >
      <div className="hero-stage">
        {/* Code-split 3D WebGL stage (DER Flyover -> 49" Curved-Monitor Desk) */}
        <div className={`hero-webgl-wrap${webglReady ? ' is-ready' : ''}`}>
          {!webglFallback && (
            <Suspense fallback={null}>
              <Hero3DCanvas
                runwayRef={runwayRef}
                reducedMotion={reducedMotion}
                onFrameUpdate={applyProgressToDom}
                onWebGLReady={handleReady}
                onWebGLFallback={handleFallback}
              />
            </Suspense>
          )}
        </div>

        {/* Persistent monochrome top bar across both Act 1 and Act 2 */}
        <header className="hero-topbar-shell">
          <div className="hero-topbar">
            <a href="/" className="site-kicker">REUBEN PETER-PAUL</a>
            <DarkModeToggle />
          </div>
        </header>

        {/* Act 1 Editorial Overlay (upper-left architectural plate) */}
        <div ref={act1OverlayRef} className="hero-editorial-overlay">
          <div className="hero-editorial-card">
            <h1 className="hero-title">
              Systems, shaping,
              <em className="hero-title-italic">and field notes.</em>
            </h1>

            <p className="hero-lead">
              Why certain engineering approaches hold up, how I judge whether I am actually
              improving, and reads worth a peer&rsquo;s time outside social media.
            </p>

            <nav className="hero-nav" aria-label="Primary">
              <a href="#worth-looking-at" onClick={handleSmoothSectionJump('worth-looking-at')}>
                Worth looking at
              </a>
              <a href="#field-notes" onClick={handleSmoothSectionJump('field-notes')}>
                Field notes
              </a>
              <a href="#projects" onClick={handleSmoothSectionJump('projects')}>
                Projects
              </a>
              <a href="/feed.xml">RSS</a>
              <a href="https://github.com/scaryponens" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/reubenpeterpaul/"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
              <a href="mailto:reuben.peterpaul@protonmail.com">Email</a>
            </nav>

            {reducedMotion && (
              <div className="hero-reduced-shortcuts" aria-label="Direct desktop shortcuts">
                <a
                  href="#field-notes"
                  className="hero-reduced-btn"
                  onClick={handleSmoothSectionJump('field-notes')}
                >
                  <FieldNotesIconSvg />
                  <span>Field Notes</span>
                </a>
                <a
                  href="#worth-looking-at"
                  className="hero-reduced-btn"
                  onClick={handleSmoothSectionJump('worth-looking-at')}
                >
                  <CuratedRadarIconSvg />
                  <span>Curated Radar</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Quiet Scroll ↓ indicator in Act 1 */}
        <div ref={scrollCueRef} className="hero-scroll-cue" aria-hidden="true">
          <span>Scroll ↓</span>
        </div>

        {/* Act 2: Crisp Accessible HTML/SVG Desktop Layer inside the 49" Curved Monitor */}
        <div
          ref={monitorOverlayRef}
          className={`hero-monitor-screen${isDeskActive ? ' is-active' : ''}${
            webglFallback ? ' is-fallback-bezel' : ''
          }`}
          aria-hidden={!isDeskActive}
        >
          {/* Floating monochrome agentic tooling logos across the 32:9 wings */}
          <div className="monitor-ambient-logos" aria-hidden="true">
            <span className="floating-tool floating-orca" title="Orca">
              <OrcaLogoSvg />
            </span>
            <span className="floating-tool floating-obsidian" title="Obsidian">
              <ObsidianLogoSvg />
            </span>
            <span className="floating-tool floating-antigravity" title="Antigravity">
              <AntigravityLogoSvg />
            </span>
            <span className="floating-tool floating-pi" title="Pi">
              <PiLogoSvg />
            </span>
          </div>

          {/* Two clickable accessible desktop icons */}
          <nav className="monitor-desktop-icons" aria-label="Monitor desktop shortcuts">
            <a
              href="#field-notes"
              className="monitor-desktop-icon"
              tabIndex={isDeskActive ? 0 : -1}
              onClick={handleSmoothSectionJump('field-notes')}
            >
              <span className="monitor-icon-frame">
                <FieldNotesIconSvg />
              </span>
              <span className="monitor-icon-label">Field Notes</span>
            </a>

            <a
              href="#worth-looking-at"
              className="monitor-desktop-icon"
              tabIndex={isDeskActive ? 0 : -1}
              onClick={handleSmoothSectionJump('worth-looking-at')}
            >
              <span className="monitor-icon-frame">
                <CuratedRadarIconSvg />
              </span>
              <span className="monitor-icon-label">Curated Radar</span>
            </a>
          </nav>
        </div>

        {/* Subtle monochrome studio caption in Act 2 */}
        <div ref={act2CaptionRef} className="hero-desk-caption" aria-hidden="true">
          <span>49″ Ultrawide Bench · Select an index or scroll for 01 / NOW ↓</span>
        </div>
      </div>
    </section>
  )
}

export default Hero3D
