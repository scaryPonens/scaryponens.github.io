import {
  Color,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshLambertMaterial,
} from 'three'
import { createVoltusMugTexture, updateVoltusMugTexture } from './voltusLogoSvg'

export const PALETTES = {
  dark: {
    bg: '#282828',
    massDeep: '#32302f',
    massMid: '#3c3836',
    massHigh: '#504945',
    screenSurface: '#242221',
    coffeeSurface: '#1d1c1b',
    lineMuted: '#a89984',
    lineInk: '#ebdbb2',
    ambientIntensity: 0.9,
    keyIntensity: 0.38,
    fillIntensity: 0.16,
    gridOpacity: 0.22,
    mutedLineOpacity: 0.5,
    inkLineOpacity: 0.84,
    screenArcOpacity: 0.22,
  },
  light: {
    bg: '#faf8f4',
    massDeep: '#f1ede6',
    massMid: '#e5dfd3',
    massHigh: '#d8d2c7',
    screenSurface: '#f4f0e8',
    coffeeSurface: '#4a453e',
    lineMuted: '#787067',
    lineInk: '#1c1a17',
    ambientIntensity: 0.84,
    keyIntensity: 0.24,
    fillIntensity: 0.1,
    gridOpacity: 0.22,
    mutedLineOpacity: 0.44,
    inkLineOpacity: 0.74,
    screenArcOpacity: 0.18,
  },
}

export function isDocumentDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

export function createThemeMaterials(initialDark) {
  const p = initialDark ? PALETTES.dark : PALETTES.light

  const materials = {
    ground: new MeshBasicMaterial({
      color: p.bg,
      fog: true,
    }),
    massDeep: new MeshLambertMaterial({
      color: p.massDeep,
      fog: true,
    }),
    massMid: new MeshLambertMaterial({
      color: p.massMid,
      fog: true,
    }),
    massHigh: new MeshLambertMaterial({
      color: p.massHigh,
      fog: true,
    }),
    screenSurface: new MeshBasicMaterial({
      color: p.screenSurface,
      fog: true,
    }),
    coffeeSurface: new MeshBasicMaterial({
      color: p.coffeeSurface,
      fog: true,
    }),
    gridLine: new LineBasicMaterial({
      color: p.lineMuted,
      transparent: true,
      opacity: p.gridOpacity,
      fog: true,
    }),
    mutedLine: new LineBasicMaterial({
      color: p.lineMuted,
      transparent: true,
      opacity: p.mutedLineOpacity,
      fog: true,
    }),
    inkLine: new LineBasicMaterial({
      color: p.lineInk,
      transparent: true,
      opacity: p.inkLineOpacity,
      fog: true,
    }),
    screenArcLine: new LineBasicMaterial({
      color: p.lineMuted,
      transparent: true,
      opacity: p.screenArcOpacity,
      fog: true,
    }),
    pulse: new MeshBasicMaterial({
      color: p.lineInk,
      fog: true,
    }),
  }

  if (typeof document !== 'undefined') {
    const voltusTex = createVoltusMugTexture(initialDark)
    materials._voltusTex = voltusTex
    materials.voltusDecal = new MeshBasicMaterial({
      map: voltusTex.texture,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      fog: true,
    })
  }

  return materials
}

export function applyThemeToScene({
  isDark,
  renderer,
  materials,
  flyoverScene,
  deskScene,
  lights,
}) {
  const p = isDark ? PALETTES.dark : PALETTES.light
  const bgColor = new Color(p.bg)

  renderer.setClearColor(bgColor, 1)

  if (flyoverScene.fog) {
    flyoverScene.fog.color.copy(bgColor)
  }
  if (deskScene.fog) {
    deskScene.fog.color.copy(bgColor)
  }

  materials.ground.color.set(p.bg)
  materials.massDeep.color.set(p.massDeep)
  materials.massMid.color.set(p.massMid)
  materials.massHigh.color.set(p.massHigh)
  materials.screenSurface.color.set(p.screenSurface)
  materials.coffeeSurface.color.set(p.coffeeSurface)

  materials.gridLine.color.set(p.lineMuted)
  materials.gridLine.opacity = p.gridOpacity

  materials.mutedLine.color.set(p.lineMuted)
  materials.mutedLine.opacity = p.mutedLineOpacity

  materials.inkLine.color.set(p.lineInk)
  materials.inkLine.opacity = p.inkLineOpacity

  materials.screenArcLine.color.set(p.lineMuted)
  materials.screenArcLine.opacity = p.screenArcOpacity

  materials.pulse.color.set(p.lineInk)
  if (materials._voltusTex) {
    updateVoltusMugTexture(materials._voltusTex, isDark)
  }

  for (const lightSet of lights) {
    lightSet.ambient.intensity = p.ambientIntensity
    lightSet.key.intensity = p.keyIntensity
    lightSet.fill.intensity = p.fillIntensity
  }
}

export function disposeMaterials(materials) {
  if (materials._voltusTex && materials._voltusTex.texture) {
    materials._voltusTex.texture.dispose()
  }
  Object.values(materials).forEach((mat) => {
    if (mat && typeof mat.dispose === 'function') {
      mat.dispose()
    }
  })
}
