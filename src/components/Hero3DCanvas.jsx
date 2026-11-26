import { useEffect, useRef } from 'react'
import {
  NoToneMapping,
  PerspectiveCamera,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import {
  createThemeMaterials,
  applyThemeToScene,
  disposeMaterials,
  isDocumentDark,
} from '../hero3d/palettes'
import { buildFlyoverScene } from '../hero3d/buildFlyoverScene'
import { buildDeskScene } from '../hero3d/buildDeskScene'

const HANDOFF_P = 0.495

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function Hero3DCanvas({ runwayRef, reducedMotion, onFrameUpdate, onWebGLReady, onWebGLFallback }) {
  const containerRef = useRef(null)
  const onFrameUpdateRef = useRef(onFrameUpdate)
  const reducedMotionRef = useRef(reducedMotion)

  onFrameUpdateRef.current = onFrameUpdate
  reducedMotionRef.current = reducedMotion

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    let renderer
    try {
      renderer = new WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
      })
    } catch {
      onWebGLFallback?.(true)
      return undefined
    }

    renderer.toneMapping = NoToneMapping
    renderer.outputColorSpace = SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))

    const canvas = renderer.domElement
    canvas.className = 'hero-webgl-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    container.appendChild(canvas)

    const initialDark = isDocumentDark()
    const materials = createThemeMaterials(initialDark)
    const flyover = buildFlyoverScene(materials)
    const desk = buildDeskScene(materials)

    const flyoverCamera = new PerspectiveCamera(44, 1, 0.2, 220)
    const deskCamera = new PerspectiveCamera(40, 1, 0.1, 100)

    applyThemeToScene({
      isDark: initialDark,
      renderer,
      materials,
      flyoverScene: flyover.scene,
      deskScene: desk.scene,
      lights: [flyover.lights, desk.lights],
    })

    let width = 1
    let height = 1
    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      width = Math.max(1, Math.round(rect.width || window.innerWidth))
      height = Math.max(1, Math.round(rect.height || window.innerHeight))
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      renderer.setSize(width, height, false)

      const aspect = width / height
      flyoverCamera.aspect = aspect
      // Slightly wider vertical FOV on narrow mobile portrait so all 5 DER zones stay framed
      flyoverCamera.fov = aspect < 0.85 ? 54 : 44
      flyoverCamera.updateProjectionMatrix()

      deskCamera.aspect = aspect
      deskCamera.updateProjectionMatrix()
    }
    updateSize()

    const computeRawScrollProgress = () => {
      const runway = runwayRef.current
      if (!runway) return 0
      const rect = runway.getBoundingClientRect()
      const maxScroll = Math.max(1, runway.offsetHeight - height)
      return clamp(-rect.top / maxScroll, 0, 1)
    }

    let targetProgress = computeRawScrollProgress()
    let smoothProgress = targetProgress

    let targetPtrX = 0
    let targetPtrY = 0
    let smoothPtrX = 0
    let smoothPtrY = 0

    let elapsedFlyTime = 0
    let baseFlyZ = 14
    let lastTimestamp = performance.now()
    let isIntersecting = true
    let isPageVisible = !document.hidden
    let rafId = 0
    let singleFrameScheduled = false
    let disposed = false

    const renderFrame = (dt) => {
      if (disposed) return

      const isReduced = reducedMotionRef.current
      if (isReduced) {
        smoothProgress = targetProgress
        smoothPtrX = 0
        smoothPtrY = 0
      } else {
        const lerpFactor = 1 - Math.exp(-dt * 11)
        smoothProgress += (targetProgress - smoothProgress) * lerpFactor
        if (Math.abs(targetProgress - smoothProgress) < 0.0004) {
          smoothProgress = targetProgress
        }
        smoothPtrX += (targetPtrX - smoothPtrX) * (1 - Math.exp(-dt * 6))
        smoothPtrY += (targetPtrY - smoothPtrY) * (1 - Math.exp(-dt * 6))

        elapsedFlyTime += dt
        baseFlyZ -= dt * 5.6
        // Keep baseFlyZ bounded numerically over hours of viewing using exact tile period
        if (baseFlyZ < -5600) {
          baseFlyZ += 5600
        }
      }

      if (smoothProgress < HANDOFF_P) {
        const act1Fade = clamp((smoothProgress - 0.415) / (HANDOFF_P - 0.415), 0, 1)
        const cameraZ = baseFlyZ - smoothProgress * 26
        flyover.update(elapsedFlyTime, cameraZ, smoothPtrX, smoothPtrY, act1Fade, flyoverCamera)
        renderer.render(flyover.scene, flyoverCamera)
        onFrameUpdateRef.current?.(smoothProgress, null)
      } else {
        const settleProgress = clamp((smoothProgress - HANDOFF_P) / (0.75 - HANDOFF_P), 0, 1)
        desk.update(settleProgress, smoothPtrX, smoothPtrY, deskCamera, width, height, elapsedFlyTime)
        renderer.render(desk.scene, deskCamera)
        const screenBox = desk.projectScreenBox(deskCamera, width, height)
        onFrameUpdateRef.current?.(smoothProgress, screenBox)
      }
    }

    const scheduleSingleFrame = () => {
      if (disposed || singleFrameScheduled || rafId !== 0) return
      singleFrameScheduled = true
      requestAnimationFrame(() => {
        singleFrameScheduled = false
        if (!disposed) {
          renderFrame(0.016)
        }
      })
    }

    const tick = (now) => {
      if (disposed) return
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTimestamp) / 1000))
      lastTimestamp = now

      renderFrame(dt)

      if (isIntersecting && isPageVisible && !reducedMotionRef.current) {
        rafId = requestAnimationFrame(tick)
      } else {
        rafId = 0
      }
    }

    const syncLoopState = () => {
      if (disposed) return
      const shouldLoop = isIntersecting && isPageVisible && !reducedMotionRef.current
      if (shouldLoop && rafId === 0) {
        lastTimestamp = performance.now()
        rafId = requestAnimationFrame(tick)
      } else if (!shouldLoop && rafId !== 0) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    }

    const handleScroll = () => {
      targetProgress = computeRawScrollProgress()
      if (reducedMotionRef.current) {
        scheduleSingleFrame()
      } else {
        syncLoopState()
      }
    }

    const handleResize = () => {
      updateSize()
      targetProgress = computeRawScrollProgress()
      if (rafId === 0) {
        scheduleSingleFrame()
      }
    }

    const handlePointerMove = (e) => {
      if (reducedMotionRef.current) return
      targetPtrX = (e.clientX / Math.max(1, width) - 0.5) * 2
      targetPtrY = -(e.clientY / Math.max(1, height) - 0.5) * 2
    }

    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden
      syncLoopState()
      if (isPageVisible && rafId === 0) {
        scheduleSingleFrame()
      }
    }

    // Live MutationObserver for document.documentElement.classList ('dark')
    const themeObserver = new MutationObserver(() => {
      applyThemeToScene({
        isDark: isDocumentDark(),
        renderer,
        materials,
        flyoverScene: flyover.scene,
        deskScene: desk.scene,
        lights: [flyover.lights, desk.lights],
      })
      if (rafId === 0) {
        scheduleSingleFrame()
      }
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // IntersectionObserver to pause WebGL loop completely when scrolled past hero
    let intersectionObserver = null
    if (typeof IntersectionObserver !== 'undefined' && runwayRef.current) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            isIntersecting = entry.isIntersecting
          }
          syncLoopState()
        },
        { threshold: 0 }
      )
      intersectionObserver.observe(runwayRef.current)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Render initial frame immediately and start loop if appropriate
    renderFrame(0.016)
    onWebGLReady?.()
    syncLoopState()

    return () => {
      disposed = true
      if (rafId !== 0) {
        cancelAnimationFrame(rafId)
      }
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      themeObserver.disconnect()
      if (intersectionObserver) {
        intersectionObserver.disconnect()
      }
      flyover.dispose()
      desk.dispose()
      disposeMaterials(materials)
      renderer.dispose()
      if (canvas.parentNode === container) {
        container.removeChild(canvas)
      }
    }
  }, [runwayRef, onWebGLReady, onWebGLFallback])

  // Re-evaluate loop state if prefers-reduced-motion toggles live
  useEffect(() => {
    window.dispatchEvent(new Event('scroll'))
  }, [reducedMotion])

  return <div ref={containerRef} className="hero-canvas-host" aria-hidden="true" />
}

export default Hero3DCanvas
