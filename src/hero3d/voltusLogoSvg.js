import { CanvasTexture, ClampToEdgeWrapping, LinearFilter, SRGBColorSpace } from 'three'
import { PALETTES } from './palettes'

// Exact geometric vector paths for the lowercase 'voltus' wordmark (viewBox="80 96 740 226"),
// omitting the small tagline so the mark reads sharply at 3D coffee-mug scale.
const PATH_V_FILL =
  'M 90.5 167 L 110.2 167 L 160.0 292.5 L 209.8 167 L 229.5 167 L 171.2 308.5 C 168.8 313.8, 151.2 313.8, 148.8 308.5 Z'

const PATH_RING_UP =
  'M 316.6 174.3 C 330.6 169.3, 335.8 169.0, 350.4 172.3 C 380.2 178.9, 402.8 213.1, 397.2 243.2 C 394.5 257.8, 392.1 262.5, 382.0 273.4 C 361.3 295.9, 320.5 298.4, 297.2 278.5 C 285.9 268.9, 283.0 264.5, 278.6 250.3 C 269.5 221.1, 287.8 184.5, 316.6 174.3 Z'

const PATH_RING_DOWN =
  'M 316.9 296.7 C 302.9 301.7, 297.7 302.0, 283.1 298.7 C 253.3 292.1, 230.7 257.9, 236.3 227.8 C 239.0 213.2, 241.4 208.5, 251.5 197.6 C 272.2 175.1, 313.0 172.6, 336.3 192.5 C 347.6 202.1, 350.5 206.5, 354.9 220.7 C 364.0 249.9, 345.7 286.5, 316.9 296.7 Z'

const PATH_L_FILL = 'M 421.5 102 L 439.0 102 L 439.0 310 L 421.5 310 Z'

// Voltus custom 't': flush left stem, right-extending crossbar, curved bottom foot
const PATH_T_STROKE = 'M 485.0 129 L 485.0 273 C 485.0 296, 498.0 302.5, 520.0 302.5 L 542.5 302.5'
const PATH_T_BAR_FILL = 'M 476.2 167 L 542.5 167 L 542.5 184.2 L 476.2 184.2 Z'

// Spurless geometric 'u' bowl
const PATH_U_STROKE =
  'M 566.2 167 L 566.2 252 C 566.2 286.5, 587.5 303.5, 615.8 303.5 C 644.1 303.5, 665.4 286.5, 665.4 252 L 665.4 167'

// Geometric 's' with flat horizontal top/bottom terminals
const PATH_S_STROKE =
  'M 800.0 175.6 L 736.0 175.6 C 714.0 175.6, 704.5 187.5, 704.5 203.2 C 704.5 219.5, 716.0 228.5, 742.0 235.5 L 766.0 242.0 C 792.5 249.0, 801.5 259.5, 801.5 276.5 C 801.5 292.8, 790.0 302.4, 766.0 302.4 L 697.0 302.4'

export function buildVoltusMonochromeSvg(color = 'currentColor') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="80 96 740 226" fill="none">
  <defs>
    <mask id="voltus-ring-down-mask">
      <rect x="80" y="96" width="740" height="226" fill="white" />
      <g clip-path="url(#voltus-upper-cross)">
        <path d="${PATH_RING_UP}" stroke="black" stroke-width="27.5" stroke-linejoin="round" />
      </g>
    </mask>
    <mask id="voltus-ring-up-mask">
      <rect x="80" y="96" width="740" height="226" fill="white" />
      <g clip-path="url(#voltus-lower-cross)">
        <path d="${PATH_RING_DOWN}" stroke="black" stroke-width="27.5" stroke-linejoin="round" />
      </g>
    </mask>
    <clipPath id="voltus-upper-cross">
      <circle cx="307.5" cy="179.2" r="28" />
    </clipPath>
    <clipPath id="voltus-lower-cross">
      <circle cx="330.0" cy="290.8" r="28" />
    </clipPath>
  </defs>
  <path d="${PATH_V_FILL}" fill="${color}" />
  <path d="${PATH_RING_DOWN}" stroke="${color}" stroke-width="17.5" mask="url(#voltus-ring-down-mask)" />
  <path d="${PATH_RING_UP}" stroke="${color}" stroke-width="17.5" mask="url(#voltus-ring-up-mask)" />
  <g clip-path="url(#voltus-lower-cross)">
    <path d="${PATH_RING_DOWN}" stroke="${color}" stroke-width="17.5" />
  </g>
  <circle cx="316.8" cy="235.2" r="13.4" stroke="${color}" stroke-width="5.2" />
  <path d="${PATH_L_FILL}" fill="${color}" />
  <path d="${PATH_T_STROKE}" stroke="${color}" stroke-width="17.5" stroke-linecap="butt" />
  <path d="${PATH_T_BAR_FILL}" fill="${color}" />
  <path d="${PATH_U_STROKE}" stroke="${color}" stroke-width="17.5" stroke-linecap="butt" />
  <path d="${PATH_S_STROKE}" stroke="${color}" stroke-width="17.2" stroke-linecap="butt" />
</svg>`
}

function hexToRgbBytes(hex) {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

export function drawVoltusLogoToCanvas(canvas, inkHex) {
  const w = canvas.width
  const h = canvas.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  ctx.clearRect(0, 0, w, h)

  // Map viewBox="80 96 740 226" centered inside canvas with comfortable horizontal/vertical margin
  const vbX = 80
  const vbY = 96
  const vbW = 740
  const vbH = 226
  const padX = w * 0.055
  const padY = h * 0.1
  const scale = Math.min((w - padX * 2) / vbW, (h - padY * 2) / vbH)
  const offsetX = (w - vbW * scale) * 0.5 - vbX * scale
  const offsetY = (h - vbH * scale) * 0.5 - vbY * scale

  ctx.save()
  ctx.translate(offsetX, offsetY)
  ctx.scale(scale, scale)

  ctx.fillStyle = inkHex
  ctx.strokeStyle = inkHex
  ctx.lineJoin = 'round'
  ctx.lineCap = 'butt'

  const pV = new Path2D(PATH_V_FILL)
  const pRingUp = new Path2D(PATH_RING_UP)
  const pRingDown = new Path2D(PATH_RING_DOWN)
  const pL = new Path2D(PATH_L_FILL)
  const pT = new Path2D(PATH_T_STROKE)
  const pTBar = new Path2D(PATH_T_BAR_FILL)
  const pU = new Path2D(PATH_U_STROKE)
  const pS = new Path2D(PATH_S_STROKE)

  // 1. 'v'
  ctx.fill(pV)

  // 2. Interlocking Reuleaux 'o' rings with crisp monochrome over/under weave gaps
  ctx.lineWidth = 17.5
  ctx.stroke(pRingDown)

  // Upper crossing: UP ring passes OVER DOWN ring -> knock out sleeve around UP ring
  ctx.save()
  ctx.beginPath()
  ctx.arc(307.5, 179.2, 28, 0, Math.PI * 2)
  ctx.clip()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.lineWidth = 27.5
  ctx.stroke(pRingUp)
  ctx.restore()

  // Draw UP ring
  ctx.lineWidth = 17.5
  ctx.stroke(pRingUp)

  // Lower crossing: DOWN ring passes OVER UP ring -> knock out sleeve around DOWN ring, then redraw DOWN arc
  ctx.save()
  ctx.beginPath()
  ctx.arc(330.0, 290.8, 28, 0, Math.PI * 2)
  ctx.clip()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.lineWidth = 27.5
  ctx.stroke(pRingDown)
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineWidth = 17.5
  ctx.stroke(pRingDown)
  ctx.restore()

  // Small center circle inside 'o'
  ctx.beginPath()
  ctx.arc(316.8, 235.2, 13.4, 0, Math.PI * 2)
  ctx.lineWidth = 5.4
  ctx.stroke()

  // 3. 'l', 't', 'u', 's'
  ctx.fill(pL)

  ctx.lineWidth = 17.5
  ctx.stroke(pT)
  ctx.fill(pTBar)

  ctx.lineWidth = 17.5
  ctx.stroke(pU)

  ctx.lineWidth = 17.2
  ctx.stroke(pS)

  ctx.restore()

  // Set RGB of ALL texels (including alpha=0 transparent pixels) to exact inkHex
  // so linear texture filtering has 0.00% dark/light fringe color bleed!
  const [ir, ig, ib] = hexToRgbBytes(inkHex)
  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = ir
    data[i + 1] = ig
    data[i + 2] = ib
  }
  ctx.putImageData(imgData, 0, 0)
}

export function createVoltusMugTexture(initialDark) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 320

  const inkHex = initialDark ? PALETTES.dark.lineInk : PALETTES.light.lineInk
  drawVoltusLogoToCanvas(canvas, inkHex)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.anisotropy = 8
  texture.needsUpdate = true

  return { canvas, texture }
}

export function updateVoltusMugTexture(voltusTex, isDark) {
  if (!voltusTex || !voltusTex.canvas || !voltusTex.texture) return
  const inkHex = isDark ? PALETTES.dark.lineInk : PALETTES.light.lineInk
  drawVoltusLogoToCanvas(voltusTex.canvas, inkHex)
  voltusTex.texture.needsUpdate = true
}
