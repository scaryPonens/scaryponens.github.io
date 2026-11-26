import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DirectionalLight,
  DynamicDrawUsage,
  EdgesGeometry,
  Euler,
  Float32BufferAttribute,
  Fog,
  Group,
  InstancedMesh,
  LineSegments,
  MathUtils,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  Scene,
  Vector3,
} from 'three'

export const TILE_LENGTH = 56
export const NUM_TILES = 4

function createStarPrismGeometry(pts, depth) {
  // pts: CCW 2D polygon [[x, y], ...]; extruded symmetrically across z in [-depth/2, +depth/2]
  const hz = depth / 2
  const positions = []
  let cx = 0
  let cy = 0
  for (let i = 0; i < pts.length; i++) {
    cx += pts[i][0]
    cy += pts[i][1]
  }
  cx /= pts.length
  cy /= pts.length

  const pushTri = (ax, ay, az, bx, by, bz, dx, dy, dz) => {
    positions.push(ax, ay, az, bx, by, bz, dx, dy, dz)
  }

  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[(i + 1) % pts.length]
    // Front cap (+hz, +Z normal)
    pushTri(cx, cy, hz, x0, y0, hz, x1, y1, hz)
    // Back cap (-hz, -Z normal)
    pushTri(cx, cy, -hz, x1, y1, -hz, x0, y0, -hz)
    // Side quad (two triangles with outward normal)
    pushTri(x0, y0, hz, x0, y0, -hz, x1, y1, -hz)
    pushTri(x0, y0, hz, x1, y1, -hz, x1, y1, hz)
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.computeVertexNormals()
  return geo
}

function createPitchedRoofGeometry(width, height, depth) {
  const hw = width / 2
  return createStarPrismGeometry(
    [
      [-hw, 0],
      [hw, 0],
      [0, height],
    ],
    depth
  )
}

function createEvBodyGeometry() {
  // Side profile of a sleek modern EV (CCW order)
  const geo = createStarPrismGeometry(
    [
      [-0.96, 0.1],
      [0.96, 0.1],
      [0.96, 0.34],
      [0.56, 0.4],
      [0.24, 0.64],
      [-0.42, 0.64],
      [-0.82, 0.42],
      [-0.96, 0.34],
    ],
    0.86
  )
  geo.rotateY(-Math.PI / 2)
  geo.computeVertexNormals()
  return geo
}

function createTurbineBladeGeometry() {
  // Tapered airfoil blade extending along +Y from hub (0..3.35, CCW order)
  const geo = createStarPrismGeometry(
    [
      [-0.07, 0.08],
      [0.08, 0.08],
      [0.16, 0.72],
      [0.09, 2.35],
      [0.025, 3.35],
      [-0.03, 3.35],
      [-0.06, 1.6],
    ],
    0.055
  )
  geo.rotateY(0.24)
  geo.computeVertexNormals()
  return geo
}

function pushTransformedEdges(edgePositions, targetArray, matrix) {
  const v = new Vector3()
  for (let i = 0; i < edgePositions.count; i++) {
    v.fromBufferAttribute(edgePositions, i).applyMatrix4(matrix)
    targetArray.push(v.x, v.y, v.z)
  }
}

function pushSeg(arr, x1, y1, z1, x2, y2, z2) {
  arr.push(x1, y1, z1, x2, y2, z2)
}

function pushRectLoopXZ(arr, cx, y, cz, w, d) {
  const hw = w / 2
  const hd = d / 2
  pushSeg(arr, cx - hw, y, cz - hd, cx + hw, y, cz - hd)
  pushSeg(arr, cx + hw, y, cz - hd, cx + hw, y, cz + hd)
  pushSeg(arr, cx + hw, y, cz + hd, cx - hw, y, cz + hd)
  pushSeg(arr, cx - hw, y, cz + hd, cx - hw, y, cz - hd)
}

function pushOctagonLoopXZ(arr, cx, y, cz, radius) {
  const sides = 8
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2 + Math.PI / 8
    const a1 = ((i + 1) / sides) * Math.PI * 2 + Math.PI / 8
    pushSeg(
      arr,
      cx + Math.cos(a0) * radius,
      y,
      cz + Math.sin(a0) * radius,
      cx + Math.cos(a1) * radius,
      y,
      cz + Math.sin(a1) * radius
    )
  }
}

export function buildFlyoverScene(materials) {
  const scene = new Scene()
  scene.fog = new Fog('#282828', 58, 146)

  // Neutral monochrome directional architectural lighting
  const ambient = new AmbientLight('#ffffff', 0.82)
  const key = new DirectionalLight('#ffffff', 0.34)
  key.position.set(-22, 38, 26)
  const fill = new DirectionalLight('#ffffff', 0.14)
  fill.position.set(24, 18, -18)
  scene.add(ambient, key, fill)

  // Shared unit geometries
  const boxGeo = new BoxGeometry(1, 1, 1)
  const boxEdges = new EdgesGeometry(boxGeo, 15)

  const octGeo = new CylinderGeometry(0.92, 1.0, 1, 8)
  octGeo.rotateY(Math.PI / 8)

  const towerGeo = new CylinderGeometry(0.15, 0.36, 1, 8)
  const towerEdges = new EdgesGeometry(towerGeo, 22)

  const roofGeo = createPitchedRoofGeometry(1, 1, 1)
  const roofEdges = new EdgesGeometry(roofGeo, 15)

  const evGeo = createEvBodyGeometry()
  const evEdges = new EdgesGeometry(evGeo, 18)

  const bladeGeo = createTurbineBladeGeometry()
  const bladeEdgesGeo = new EdgesGeometry(bladeGeo, 20)

  const pulseGeo = new BoxGeometry(1, 1, 1)

  const sharedGeometries = [
    boxGeo,
    boxEdges,
    octGeo,
    towerGeo,
    towerEdges,
    roofGeo,
    roofEdges,
    evGeo,
    evEdges,
    bladeGeo,
    bladeEdgesGeo,
    pulseGeo,
  ]

  // Instance matrix collectors for a single canonical 56-unit DER corridor tile
  const pools = {
    boxDeep: [],
    boxMid: [],
    boxHigh: [],
    octDeep: [],
    octMid: [],
    towerHigh: [],
    roofHigh: [],
    evHigh: [],
  }

  const gridVerts = []
  const mutedVerts = []
  const inkVerts = []
  const turbineSpecs = []
  const pulsePaths = []

  const tmpPos = new Vector3()
  const tmpQuat = new Quaternion()
  const tmpEuler = new Euler()
  const tmpScale = new Vector3()
  const makeMat = (x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => {
    tmpPos.set(x, y, z)
    tmpEuler.set(rx, ry, rz)
    tmpQuat.setFromEuler(tmpEuler)
    tmpScale.set(sx, sy, sz)
    return new Matrix4().compose(tmpPos, tmpQuat, tmpScale)
  }

  const addBox = (tier, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, edgeMode = 'ink') => {
    const m = makeMat(x, y, z, sx, sy, sz, rx, ry, rz)
    pools[tier].push(m)
    if (edgeMode === 'ink') {
      pushTransformedEdges(boxEdges.attributes.position, inkVerts, m)
    } else if (edgeMode === 'muted') {
      pushTransformedEdges(boxEdges.attributes.position, mutedVerts, m)
    }
    return m
  }

  // 0. Base architectural survey grid (4-unit cells across 88 x 56 tile)
  const gridHalfW = 44
  for (let x = -gridHalfW; x <= gridHalfW; x += 4) {
    pushSeg(gridVerts, x, 0.01, 0, x, 0.01, -TILE_LENGTH)
  }
  for (let z = 0; z >= -TILE_LENGTH; z -= 4) {
    pushSeg(gridVerts, -gridHalfW, 0.01, z, gridHalfW, 0.01, z)
  }

  // Central Main Distribution Spine (roadbed + dashed centerline + 3-phase utility poles)
  addBox('boxDeep', 0, 0.025, -TILE_LENGTH / 2, 3.3, 0.05, TILE_LENGTH, 0, 0, 0, 'muted')
  for (let z = -1.5; z > -TILE_LENGTH; z -= 4) {
    pushSeg(mutedVerts, 0, 0.06, z, 0, 0.06, z - 1.8)
  }

  // Cross-streets at z = -28 and z = -55.1
  addBox('boxDeep', 0, 0.022, -28.0, 33.5, 0.044, 2.2, 0, 0, 0, 'muted')

  // Utility poles along main spine (x = -2.15 and x = +2.15)
  const spinePoleZs = [-6, -20, -34, -48]
  for (const pz of spinePoleZs) {
    for (const side of [-1, 1]) {
      const px = side * 2.15
      addBox('boxMid', px, 1.65, pz, 0.14, 3.3, 0.14, 0, 0, 0, 'ink')
      addBox('boxHigh', px, 3.15, pz, 1.05, 0.1, 0.1, 0, 0, 0, 'ink')
    }
  }
  // Overhead 3-phase conductors spanning full tile
  for (const side of [-1, 1]) {
    const px = side * 2.15
    for (const dx of [-0.42, 0, 0.42]) {
      pushSeg(mutedVerts, px + dx, 3.22, 0, px + dx, 3.22, -TILE_LENGTH)
    }
  }
  // Main spine bidirectional energy flow pulses
  pulsePaths.push(
    { x1: 2.15, y1: 3.24, z1: 0, x2: 2.15, y2: 3.24, z2: -TILE_LENGTH, speed: 0.28, phase: 0.05, len: 2.8, w: 0.11 },
    { x1: 2.15, y1: 3.24, z1: 0, x2: 2.15, y2: 3.24, z2: -TILE_LENGTH, speed: 0.28, phase: 0.55, len: 2.8, w: 0.11 },
    { x1: -2.15, y1: 3.24, z1: -TILE_LENGTH, x2: -2.15, y2: 3.24, z2: 0, speed: 0.24, phase: 0.25, len: 2.6, w: 0.11 },
    { x1: -2.15, y1: 3.24, z1: -TILE_LENGTH, x2: -2.15, y2: 3.24, z2: 0, speed: 0.24, phase: 0.75, len: 2.6, w: 0.11 }
  )

  // ============================================================================
  // ZONE 1: WINDMILL FIELDS (Contoured grid ridges + rotating 3-blade turbines)
  // ============================================================================
  const addContourHill = (cx, cz, baseRadius, tiers) => {
    for (let t = 0; t < tiers; t++) {
      const r = baseRadius * (1 - t * 0.25)
      const h = 0.38
      const yCenter = t * 0.38 + h / 2
      const m = makeMat(cx, yCenter, cz, r, h, r)
      pools[t % 2 === 0 ? 'octDeep' : 'octMid'].push(m)
      pushOctagonLoopXZ(t === tiers - 1 ? inkVerts : mutedVerts, cx, (t + 1) * 0.38 + 0.01, cz, r * 0.92)
      // Subtle radial survey lines on top plateau
      if (t === tiers - 1) {
        const topY = tiers * 0.38 + 0.015
        const tr = r * 0.85
        pushSeg(mutedVerts, cx - tr, topY, cz, cx + tr, topY, cz)
        pushSeg(mutedVerts, cx, topY, cz - tr, cx, topY, cz + tr)
      }
    }
  }

  const addWindTurbine = (tx, baseElevation, tz, towerHeight, phase, speed) => {
    // Foundation pad + pad-mount transformer
    addBox('boxMid', tx, baseElevation + 0.12, tz, 1.35, 0.24, 1.35, 0, Math.PI / 4, 0, 'ink')
    addBox('boxHigh', tx - 0.95, baseElevation + 0.28, tz + 0.45, 0.55, 0.56, 0.48, 0, 0, 0, 'ink')

    // Tapered tubular wind turbine tower
    const tm = makeMat(tx, baseElevation + towerHeight / 2 + 0.2, tz, 1, towerHeight, 1)
    pools.towerHigh.push(tm)
    pushTransformedEdges(towerEdges.attributes.position, inkVerts, tm)

    // Nacelle housing at hub height
    const hubY = baseElevation + towerHeight + 0.38
    addBox('boxHigh', tx, hubY, tz - 0.15, 0.62, 0.56, 1.55, 0, 0, 0, 'ink')
    // Hub spinner nose
    addBox('boxMid', tx, hubY, tz + 0.74, 0.34, 0.34, 0.36, 0, 0, Math.PI / 4, 'ink')

    turbineSpecs.push({
      x: tx,
      y: hubY,
      z: tz + 0.9,
      phase,
      speed,
    })
  }

  // Right contoured hills & 4 prominent turbines (framed cleanly inside viewport)
  addContourHill(20.5, -12.5, 6.2, 3)
  addContourHill(26.5, -22.5, 5.0, 2)
  addContourHill(21.8, -41.5, 6.6, 3)
  addContourHill(18.5, -34.5, 4.6, 2)

  addWindTurbine(20.2, 1.14, -12.0, 6.4, 0.35, 1.08)
  addWindTurbine(26.4, 0.76, -22.2, 6.2, 2.1, 0.96)
  addWindTurbine(18.7, 0.76, -34.5, 6.3, 1.15, 1.14)
  addWindTurbine(22.2, 1.14, -42.2, 6.8, 3.6, 1.02)

  // Collector feeder lines from right-ridge turbines to Solar/BESS bus
  pushSeg(mutedVerts, 19.2, 1.16, -12.0, 14.6, 0.12, -13.8)
  pushSeg(mutedVerts, 25.4, 0.78, -22.2, 14.6, 0.12, -22.5)
  pushSeg(mutedVerts, 17.7, 0.78, -34.5, 14.6, 0.12, -35.5)
  pushSeg(mutedVerts, 21.2, 1.16, -42.2, 14.6, 0.12, -42.5)
  pulsePaths.push(
    { x1: 19.2, y1: 1.2, z1: -12.0, x2: 14.6, y2: 0.18, z2: -13.8, speed: 0.42, phase: 0.1, len: 1.5, w: 0.09 },
    { x1: 21.2, y1: 1.2, z1: -42.2, x2: 14.6, y2: 0.18, z2: -42.5, speed: 0.38, phase: 0.6, len: 1.5, w: 0.09 }
  )

  // Left contoured hills & 2 horizon turbines
  addContourHill(-21.5, -16.5, 5.8, 3)
  addContourHill(-22.5, -45.0, 6.2, 3)
  addWindTurbine(-21.2, 1.14, -16.5, 6.5, 0.85, 1.04)
  addWindTurbine(-22.2, 1.14, -45.0, 6.8, 2.75, 0.98)
  pushSeg(mutedVerts, -20.2, 1.16, -16.5, -15.4, 0.12, -16.5)
  pushSeg(mutedVerts, -21.2, 1.16, -45.0, -15.4, 0.12, -45.0)

  // ============================================================================
  // ZONE 2: SOLAR ARRAYS (Angled PV panel rows + cell grid frames + collectors)
  // Parcel: x in [3.2, 14.8], z in [-2.2, -26.0]
  // ============================================================================
  addBox('boxDeep', 9.0, 0.03, -14.1, 11.6, 0.06, 23.6, 0, 0, 0, 'muted')
  pushRectLoopXZ(inkVerts, 9.0, 0.07, -14.1, 11.4, 23.4)

  const solarRowsZ = [-4.8, -9.4, -14.0, -18.6, -23.2]
  const solarColsX = [5.6, 8.2, 10.8, 13.4]
  const pvTilt = 0.48 // ~27.5 deg facing +Z camera

  const pvUpOffset = new Vector3(0, Math.cos(pvTilt), Math.sin(pvTilt)).multiplyScalar(0.045)
  const pvQuat = new Quaternion().setFromEuler(new Euler(pvTilt, 0, 0))
  const localA = new Vector3()
  const localB = new Vector3()

  for (let r = 0; r < solarRowsZ.length; r++) {
    const rz = solarRowsZ[r]
    // String combiner box at west end of each PV row
    addBox('boxMid', 3.95, 0.36, rz, 0.36, 0.72, 0.36, 0, 0, 0, 'ink')
    // DC feeder conduit along row
    pushSeg(mutedVerts, 3.95, 0.12, rz, 14.3, 0.12, rz)

    for (let c = 0; c < solarColsX.length; c++) {
      const cx = solarColsX[c]
      // Dual steel rack stanchions
      addBox('boxMid', cx - 0.7, 0.38, rz - 0.18, 0.09, 0.76, 0.09, 0, 0, 0, 'muted')
      addBox('boxMid', cx + 0.7, 0.38, rz - 0.18, 0.09, 0.76, 0.09, 0, 0, 0, 'muted')

      // Angled PV panel table
      const py = 0.74
      const pw = 2.22
      const pd = 1.68
      addBox('boxHigh', cx, py, rz, pw, 0.065, pd, pvTilt, 0, 0, 'ink')

      // Internal photovoltaic cell wafer grid lines on angled top face
      const pushPanelLine = (lx1, lz1, lx2, lz2) => {
        localA.set(lx1, 0, lz1).applyQuaternion(pvQuat).add(pvUpOffset)
        localB.set(lx2, 0, lz2).applyQuaternion(pvQuat).add(pvUpOffset)
        pushSeg(
          mutedVerts,
          cx + localA.x,
          py + localA.y,
          rz + localA.z,
          cx + localB.x,
          py + localB.y,
          rz + localB.z
        )
      }
      for (let gx = -2; gx <= 2; gx++) {
        const xOff = (gx / 3) * (pw * 0.48)
        pushPanelLine(xOff, -pd * 0.47, xOff, pd * 0.47)
      }
      pushPanelLine(-pw * 0.48, -pd * 0.17, pw * 0.48, -pd * 0.17)
      pushPanelLine(-pw * 0.48, pd * 0.17, pw * 0.48, pd * 0.17)
    }
  }

  // Central Solar Collector & Inverter Pad feeding Main Spine
  addBox('boxMid', 4.0, 0.52, -14.0, 0.9, 1.04, 1.75, 0, 0, 0, 'ink')
  addBox('boxHigh', 4.0, 1.12, -14.0, 0.7, 0.18, 1.4, 0, 0, 0, 'ink')
  pushSeg(inkVerts, 3.95, 0.14, -4.8, 3.95, 0.14, -23.2)
  pushSeg(inkVerts, 3.55, 0.2, -14.0, 2.15, 0.2, -14.0)
  pulsePaths.push(
    { x1: 13.8, y1: 0.16, z1: -9.4, x2: 4.0, y2: 0.16, z2: -9.4, speed: 0.45, phase: 0.15, len: 1.6, w: 0.09 },
    { x1: 13.8, y1: 0.16, z1: -18.6, x2: 4.0, y2: 0.16, z2: -18.6, speed: 0.45, phase: 0.65, len: 1.6, w: 0.09 },
    { x1: 4.0, y1: 0.24, z1: -14.0, x2: 2.15, y2: 0.24, z2: -14.0, speed: 0.55, phase: 0.35, len: 0.9, w: 0.1 }
  )

  // ============================================================================
  // ZONE 3: COMMERCIAL BATTERIES / BESS (Container banks + transformers + busbars)
  // Parcel: x in [3.2, 14.8], z in [-30.0, -53.8]
  // ============================================================================
  addBox('boxDeep', 9.0, 0.045, -41.9, 11.6, 0.09, 23.6, 0, 0, 0, 'ink')
  // Substation security perimeter rail
  pushRectLoopXZ(mutedVerts, 9.0, 0.75, -41.9, 11.3, 23.2)
  for (const fx of [3.35, 14.65]) {
    for (let fz = -30.3; fz >= -53.5; fz -= 3.85) {
      pushSeg(mutedVerts, fx, 0.09, fz, fx, 0.75, fz)
    }
  }

  // 12 Containerized Megapack BESS units (6 rows x 2 columns)
  const bessRowsZ = [-32.8, -35.8, -40.4, -43.4, -48.0, -51.0]
  const bessColsX = [9.0, 12.6]
  for (const bz of bessRowsZ) {
    for (const bx of bessColsX) {
      // Concrete plinth
      addBox('boxDeep', bx, 0.14, bz, 2.95, 0.14, 1.18, 0, 0, 0, 'muted')
      // Main battery container
      addBox('boxMid', bx, 0.91, bz, 2.8, 1.4, 1.04, 0, 0, 0, 'ink')
      // Rooftop thermal HVAC module
      addBox('boxHigh', bx - 0.55, 1.7, bz, 1.35, 0.18, 0.82, 0, 0, 0, 'ink')

      // Crisp cabinet door seams & HVAC louvers on +Z and -Z faces
      for (const faceZ of [bz + 0.53, bz - 0.53]) {
        for (const dx of [-0.7, 0.0, 0.7]) {
          pushSeg(mutedVerts, bx + dx, 0.24, faceZ, bx + dx, 1.56, faceZ)
        }
        // Louver vents on thermal bay
        for (let ly = 0.45; ly <= 1.35; ly += 0.22) {
          pushSeg(inkVerts, bx - 1.25, ly, faceZ, bx - 0.82, ly, faceZ)
        }
      }
    }
    // DC Busbar trench linking column 2 -> column 1 -> inverter pad
    pushSeg(inkVerts, 12.6, 0.15, bz, 5.9, 0.15, bz)
  }

  // Bi-directional PCS Inverters + Step-Up Transformers + Overhead Busbar Gantry
  const bessGroupZs = [-34.3, -41.9, -49.5]
  for (const gz of bessGroupZs) {
    // PCS Inverter skid
    addBox('boxHigh', 6.2, 0.68, gz, 0.95, 1.18, 1.65, 0, 0, 0, 'ink')
    // Step-up Substation Transformer + radiator fins + 3 HV bushings
    addBox('boxMid', 4.55, 0.78, gz, 1.15, 1.38, 1.45, 0, 0, 0, 'ink')
    addBox('boxHigh', 4.55, 0.72, gz + 0.82, 0.9, 1.0, 0.2, 0, 0, 0, 'ink')
    for (const bxOff of [-0.3, 0, 0.3]) {
      addBox('boxHigh', 4.55 + bxOff, 1.68, gz, 0.12, 0.44, 0.12, 0, 0, 0, 'ink')
    }
    // Overhead busbar tie from transformer bushings to Main Spine
    pushSeg(inkVerts, 6.2, 1.32, gz, 4.55, 1.88, gz)
    pushSeg(inkVerts, 4.55, 1.88, gz, 2.15, 3.22, gz)
  }
  // Overhead longitudinal BESS collector busbar & gantry portals
  pushSeg(inkVerts, 6.2, 2.35, -32.0, 6.2, 2.35, -51.8)
  for (const portalZ of [-32.0, -41.9, -51.8]) {
    addBox('boxMid', 5.4, 1.22, portalZ, 0.12, 2.28, 0.12, 0, 0, 0, 'ink')
    addBox('boxMid', 7.0, 1.22, portalZ, 0.12, 2.28, 0.12, 0, 0, 0, 'ink')
    addBox('boxHigh', 6.2, 2.35, portalZ, 1.76, 0.12, 0.12, 0, 0, 0, 'ink')
  }

  // Animated monochrome ink BESS busbar pulse lines
  pulsePaths.push(
    { x1: 13.8, y1: 0.2, z1: -35.8, x2: 4.55, y2: 0.2, z2: -35.8, speed: 0.52, phase: 0.08, len: 1.55, w: 0.11 },
    { x1: 4.55, y1: 0.2, z1: -43.4, x2: 13.8, y2: 0.2, z2: -43.4, speed: 0.48, phase: 0.44, len: 1.55, w: 0.11 },
    { x1: 13.8, y1: 0.2, z1: -48.0, x2: 4.55, y2: 0.2, z2: -48.0, speed: 0.52, phase: 0.78, len: 1.55, w: 0.11 },
    { x1: 6.2, y1: 2.38, z1: -32.0, x2: 6.2, y2: 2.38, z2: -51.8, speed: 0.36, phase: 0.22, len: 2.2, w: 0.12 },
    { x1: 4.55, y1: 1.88, z1: -41.9, x2: 2.15, y2: 3.22, z2: -41.9, speed: 0.62, phase: 0.5, len: 0.95, w: 0.1 }
  )

  const addSculptedEv = (ex, ey, ez, rotY) => {
    const m = makeMat(ex, ey, ez, 1, 1, 1, 0, rotY, 0)
    pools.evHigh.push(m)
    pushTransformedEdges(evEdges.attributes.position, inkVerts, m)
    const cos = Math.cos(rotY)
    const sin = Math.sin(rotY)
    for (const [lx, lz] of [
      [-0.41, 0.56],
      [0.41, 0.56],
      [-0.41, -0.56],
      [0.41, -0.56],
    ]) {
      const wx = ex + lx * cos + lz * sin
      const wz = ez - lx * sin + lz * cos
      addBox('boxDeep', wx, ey + 0.13, wz, 0.12, 0.24, 0.32, 0, rotY, 0, 'ink')
    }
  }

  // ============================================================================
  // ZONE 5: NEIGHBORHOODS WITH EVs CHARGING (Foreground Left: z in [-2.2, -26.0])
  // Pitched-roof homes, driveways with plugged-in EVs, feeder lines & street grid
  // ============================================================================
  const nbStreetZ = -14.0
  addBox('boxDeep', -9.2, 0.025, nbStreetZ, 14.0, 0.05, 2.2, 0, 0, 0, 'muted')
  for (let rx = -3.2; rx >= -15.2; rx -= 2.8) {
    pushSeg(mutedVerts, rx, 0.06, nbStreetZ, rx - 1.3, 0.06, nbStreetZ)
  }

  // Residential overhead feeder lines along neighborhood street
  const southFeederZ = nbStreetZ + 1.45
  const northFeederZ = nbStreetZ - 1.45
  for (const fpx of [-4.0, -8.6, -13.2]) {
    addBox('boxMid', fpx, 1.25, southFeederZ, 0.1, 2.5, 0.1, 0, 0, 0, 'ink')
    addBox('boxHigh', fpx, 2.42, southFeederZ, 0.52, 0.08, 0.08, 0, 0, 0, 'ink')
  }
  pushSeg(inkVerts, -2.15, 2.46, southFeederZ, -15.4, 2.46, southFeederZ)
  pushSeg(mutedVerts, -2.15, 2.46, northFeederZ, -15.4, 2.46, northFeederZ)

  const houseLotsX = [-5.2, -9.5, -13.8]

  const addResidentialHome = (hx, hz, facingSign, hasRoofSolar, hasEv, pulsePhase) => {
    const rotY = facingSign > 0 ? 0 : Math.PI
    pushRectLoopXZ(mutedVerts, hx, 0.02, hz + facingSign * 1.4, 3.95, 8.8)

    // Main House Body
    const bodyX = hx - 0.45 * facingSign
    addBox('boxMid', bodyX, 0.78, hz, 2.35, 1.56, 2.25, 0, 0, 0, 'ink')

    // Pitched Gable Roof (ridge runs along X)
    const rm = makeMat(bodyX, 1.56, hz, 2.6, 0.96, 2.52, 0, Math.PI / 2, 0)
    pools.roofHigh.push(rm)
    pushTransformedEdges(roofEdges.attributes.position, inkVerts, rm)

    if (hasRoofSolar) {
      const slopeTilt = facingSign > 0 ? 0.62 : -0.62
      addBox(
        'boxDeep',
        bodyX,
        2.05,
        hz + facingSign * 0.48,
        1.75,
        0.05,
        0.95,
        slopeTilt,
        0,
        0,
        'ink'
      )
    }

    // Attached Garage Wing
    const garX = hx + 1.15 * facingSign
    const garZ = hz + facingSign * 0.22
    addBox('boxDeep', garX, 0.62, garZ, 1.42, 1.24, 1.92, 0, 0, 0, 'ink')
    addBox('boxHigh', garX, 1.28, garZ, 1.56, 0.1, 2.06, 0, 0, 0, 'ink')
    const doorZ = garZ + facingSign * 0.97
    pushSeg(mutedVerts, garX - 0.5, 0.08, doorZ, garX - 0.5, 0.98, doorZ)
    pushSeg(mutedVerts, garX + 0.5, 0.08, doorZ, garX + 0.5, 0.98, doorZ)
    pushSeg(mutedVerts, garX - 0.5, 0.98, doorZ, garX + 0.5, 0.98, doorZ)

    // Paved Driveway from garage to neighborhood street
    const streetEdgeZ = nbStreetZ - facingSign * 1.1
    const driveMidZ = (doorZ + streetEdgeZ) / 2
    const driveLen = Math.abs(streetEdgeZ - doorZ)
    addBox('boxDeep', garX, 0.03, driveMidZ, 1.28, 0.05, driveLen, 0, 0, 0, 'muted')

    // Wallbox EVSE Charger mounted beside garage entrance
    const evseX = garX - 0.62 * facingSign
    const evseZ = doorZ + facingSign * 0.08
    addBox('boxHigh', evseX, 0.66, evseZ, 0.18, 0.32, 0.14, 0, 0, 0, 'ink')

    const feederLineZ = facingSign < 0 ? southFeederZ : northFeederZ
    pushSeg(mutedVerts, evseX, 0.12, feederLineZ, evseX, 0.12, evseZ)

    if (hasEv) {
      const evZ = doorZ + facingSign * 1.58
      addSculptedEv(garX, 0.055, evZ, rotY)
      pushSeg(inkVerts, evseX, 0.56, evseZ, garX - 0.32 * facingSign, 0.36, evZ - facingSign * 0.35)
      pulsePaths.push({
        x1: evseX,
        y1: 0.18,
        z1: feederLineZ,
        x2: garX,
        y2: 0.34,
        z2: evZ,
        speed: 0.54,
        phase: pulsePhase,
        len: 0.85,
        w: 0.085,
      })
    }
  }

  // South row of homes (z = -6.6, facing -Z toward z = -14 street)
  addResidentialHome(houseLotsX[0], -6.6, -1, true, true, 0.12)
  addResidentialHome(houseLotsX[1], -6.6, -1, false, true, 0.45)
  addResidentialHome(houseLotsX[2], -6.6, -1, true, true, 0.78)

  // North row of homes (z = -21.4, facing +Z toward z = -14 street)
  addResidentialHome(houseLotsX[0], -21.4, 1, false, true, 0.28)
  addResidentialHome(houseLotsX[1], -21.4, 1, true, true, 0.6)
  addResidentialHome(houseLotsX[2], -21.4, 1, true, false, 0.88)

  pulsePaths.push(
    { x1: -2.15, y1: 2.48, z1: southFeederZ, x2: -15.2, y2: 2.48, z2: southFeederZ, speed: 0.4, phase: 0.18, len: 1.9, w: 0.1 },
    { x1: -2.15, y1: 2.48, z1: southFeederZ, x2: -15.2, y2: 2.48, z2: southFeederZ, speed: 0.4, phase: 0.68, len: 1.9, w: 0.1 }
  )

  // ============================================================================
  // ZONE 4: PARKING LOTS WITH CHARGING EVs (Midground Left: z in [-30.0, -53.8])
  // Marked stalls + dual-port charge pedestals + parked EVs + charging pulses
  // ============================================================================
  addBox('boxDeep', -8.5, 0.03, -41.9, 11.4, 0.06, 23.6, 0, 0, 0, 'muted')
  pushRectLoopXZ(inkVerts, -8.5, 0.07, -41.9, 11.2, 23.4)

  // Low-slung commercial retail/fleet pavilion along far west edge
  addBox('boxMid', -13.4, 0.95, -41.9, 1.65, 1.85, 18.8, 0, 0, 0, 'ink')
  addBox('boxHigh', -13.4, 1.94, -41.9, 1.8, 0.12, 19.0, 0, 0, 0, 'ink')

  // Central EV Charging Island Spine (x = -6.85, shifted east so fully visible beside card!)
  const islandX = -6.85
  addBox('boxMid', islandX, 0.11, -41.9, 0.72, 0.12, 19.8, 0, 0, 0, 'ink')
  // Pad-mount EV Fleet Transformer tying into Main Spine
  addBox('boxHigh', islandX, 0.52, -31.2, 0.92, 0.96, 0.92, 0, 0, 0, 'ink')
  pushSeg(inkVerts, -2.15, 0.14, -31.2, islandX, 0.14, -31.2)

  // 8 stall rows (16 marked stalls) + 8 Dual-Port EV Charge Pedestals + 12 Parked EVs
  const stallStartZ = -32.8
  const stallPitch = 2.42
  for (let s = 0; s <= 8; s++) {
    const lineZ = stallStartZ - s * stallPitch
    pushSeg(mutedVerts, islandX - 2.75, 0.075, lineZ, islandX - 0.4, 0.075, lineZ)
    pushSeg(mutedVerts, islandX + 0.4, 0.075, lineZ, islandX + 2.75, 0.075, lineZ)
  }

  const occupiedWest = [0, 1, 2, 4, 6, 7]
  const occupiedEast = [0, 1, 3, 4, 5, 7]
  for (let s = 0; s < 8; s++) {
    const sz = stallStartZ - (s + 0.5) * stallPitch
    // Dual-port charging pedestal on central island
    addBox('boxHigh', islandX, 0.68, sz, 0.24, 1.08, 0.28, 0, 0, 0, 'ink')

    if (occupiedWest.includes(s)) {
      addSculptedEv(islandX - 1.65, 0.06, sz, Math.PI / 2)
      pushSeg(inkVerts, islandX - 0.12, 0.42, sz, islandX - 0.72, 0.32, sz)
    }
    if (occupiedEast.includes(s)) {
      addSculptedEv(islandX + 1.65, 0.06, sz, -Math.PI / 2)
      pushSeg(inkVerts, islandX + 0.12, 0.42, sz, islandX + 0.72, 0.32, sz)
    }
  }

  pulsePaths.push(
    { x1: -2.15, y1: 0.18, z1: -31.2, x2: islandX, y2: 0.18, z2: -31.2, speed: 0.52, phase: 0.12, len: 1.2, w: 0.1 },
    { x1: islandX, y1: 0.22, z1: -31.6, x2: islandX, y2: 0.22, z2: -51.6, speed: 0.38, phase: 0.05, len: 2.1, w: 0.11 },
    { x1: islandX, y1: 0.22, z1: -31.6, x2: islandX, y2: 0.22, z2: -51.6, speed: 0.38, phase: 0.55, len: 2.1, w: 0.11 },
    { x1: islandX, y1: 0.36, z1: -36.43, x2: islandX + 1.6, y2: 0.36, z2: -36.43, speed: 0.68, phase: 0.3, len: 0.65, w: 0.08 },
    { x1: islandX, y1: 0.36, z1: -41.27, x2: islandX + 1.6, y2: 0.36, z2: -41.27, speed: 0.68, phase: 0.7, len: 0.65, w: 0.08 },
    { x1: islandX, y1: 0.36, z1: -48.53, x2: islandX - 1.6, y2: 0.36, z2: -48.53, speed: 0.68, phase: 0.5, len: 0.65, w: 0.08 }
  )

  // Build shared LineSegments BufferGeometries once
  const makeLineGeo = (verts) => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(verts, 3))
    sharedGeometries.push(geo)
    return geo
  }
  const tileGridGeo = makeLineGeo(gridVerts)
  const tileMutedGeo = makeLineGeo(mutedVerts)
  const tileInkGeo = makeLineGeo(inkVerts)

  // Build ground plane attached to camera Z so horizon is endless
  const groundGeo = new PlaneGeometry(340, 340)
  groundGeo.rotateX(-Math.PI / 2)
  sharedGeometries.push(groundGeo)
  const groundMesh = new Mesh(groundGeo, materials.ground)
  groundMesh.position.y = -0.02
  scene.add(groundMesh)

  // Instantiate the 4 leapfrogging corridor tiles sharing geometries & materials
  const buildInstancedPool = (geo, mat, matrices) => {
    const mesh = new InstancedMesh(geo, mat, matrices.length)
    for (let i = 0; i < matrices.length; i++) {
      mesh.setMatrixAt(i, matrices[i])
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.frustumCulled = false
    return mesh
  }

  const tiles = []
  const allRotors = []
  const tilePulseMeshes = []

  for (let t = 0; t < NUM_TILES; t++) {
    const tileGroup = new Group()
    tileGroup.position.z = -t * TILE_LENGTH

    tileGroup.add(
      buildInstancedPool(boxGeo, materials.massDeep, pools.boxDeep),
      buildInstancedPool(boxGeo, materials.massMid, pools.boxMid),
      buildInstancedPool(boxGeo, materials.massHigh, pools.boxHigh),
      buildInstancedPool(octGeo, materials.massDeep, pools.octDeep),
      buildInstancedPool(octGeo, materials.massMid, pools.octMid),
      buildInstancedPool(towerGeo, materials.massHigh, pools.towerHigh),
      buildInstancedPool(roofGeo, materials.massHigh, pools.roofHigh),
      buildInstancedPool(evGeo, materials.massHigh, pools.evHigh)
    )

    const gridLines = new LineSegments(tileGridGeo, materials.gridLine)
    const mutedLines = new LineSegments(tileMutedGeo, materials.mutedLine)
    const inkLines = new LineSegments(tileInkGeo, materials.inkLine)
    gridLines.frustumCulled = false
    mutedLines.frustumCulled = false
    inkLines.frustumCulled = false
    tileGroup.add(gridLines, mutedLines, inkLines)

    // 3-blade wind turbine rotors for this tile
    for (let w = 0; w < turbineSpecs.length; w++) {
      const spec = turbineSpecs[w]
      const rotorGroup = new Group()
      rotorGroup.position.set(spec.x, spec.y, spec.z)

      for (let b = 0; b < 3; b++) {
        const bladePivot = new Group()
        bladePivot.rotation.z = (b * Math.PI * 2) / 3
        const bladeMesh = new Mesh(bladeGeo, materials.massHigh)
        const bladeLine = new LineSegments(bladeEdgesGeo, materials.inkLine)
        bladePivot.add(bladeMesh, bladeLine)
        rotorGroup.add(bladePivot)
      }

      tileGroup.add(rotorGroup)
      allRotors.push({
        group: rotorGroup,
        phase: spec.phase + t * 0.95,
        speed: spec.speed,
      })
    }

    // Animated energy-flow pulses for this tile
    const pulseMesh = new InstancedMesh(pulseGeo, materials.pulse, pulsePaths.length)
    pulseMesh.instanceMatrix.setUsage(DynamicDrawUsage)
    pulseMesh.frustumCulled = false
    tileGroup.add(pulseMesh)
    tilePulseMeshes.push({ mesh: pulseMesh, tileOffsetPhase: t * 0.23 })

    scene.add(tileGroup)
    tiles.push(tileGroup)
  }

  // Reusable scratch objects for zero-allocation per-frame animation
  const pStart = new Vector3()
  const pEnd = new Vector3()
  const pPos = new Vector3()
  const pDir = new Vector3()
  const pQuat = new Quaternion()
  const pScale = new Vector3()
  const pMat = new Matrix4()
  const unitZ = new Vector3(0, 0, 1)

  function update(time, cameraZ, pointerX, pointerY, act1FadeProgress, camera) {
    // Leapfrog tiles seamlessly ahead of cameraZ along -Z
    const recycleThreshold = cameraZ + 4
    const totalSpan = NUM_TILES * TILE_LENGTH
    for (let i = 0; i < tiles.length; i++) {
      // A tile covers [tile.position.z, tile.position.z - TILE_LENGTH]
      // Once its north/front edge (tile.position.z - TILE_LENGTH) is behind camera + buffer, leapfrog it forward
      while (tiles[i].position.z - TILE_LENGTH > recycleThreshold) {
        tiles[i].position.z -= totalSpan
      }
      while (tiles[i].position.z - TILE_LENGTH <= recycleThreshold - totalSpan) {
        tiles[i].position.z += totalSpan
      }
    }

    groundMesh.position.z = cameraZ - 85

    // Rotate 3-blade wind turbines
    for (let i = 0; i < allRotors.length; i++) {
      const r = allRotors[i]
      r.group.rotation.z = -(r.phase + time * r.speed)
    }

    // Animate monochrome ink energy-flow pulses along busbars, feeders & chargers
    for (let t = 0; t < tilePulseMeshes.length; t++) {
      const { mesh, tileOffsetPhase } = tilePulseMeshes[t]
      for (let i = 0; i < pulsePaths.length; i++) {
        const path = pulsePaths[i]
        const u = (time * path.speed + path.phase + tileOffsetPhase) % 1
        pStart.set(path.x1, path.y1, path.z1)
        pEnd.set(path.x2, path.y2, path.z2)
        pPos.lerpVectors(pStart, pEnd, u)
        pDir.subVectors(pEnd, pStart)
        const segLen = pDir.length()
        pDir.normalize()
        pQuat.setFromUnitVectors(unitZ, pDir)

        const env = Math.sin(u * Math.PI)
        const curLen = Math.min(path.len, segLen * 0.45) * (0.35 + 0.65 * env)
        const curW = path.w * (0.65 + 0.35 * env)
        pScale.set(curW, curW * 0.85, Math.max(0.05, curLen))
        pMat.compose(pPos, pQuat, pScale)
        mesh.setMatrixAt(i, pMat)
      }
      mesh.instanceMatrix.needsUpdate = true
    }

    // Camera bird's-eye glide + subtle pointer parallax + smooth transition dive/fog
    // act1FadeProgress in [0, 1] maps scroll p in [0.42, 0.50] into smooth ink-mist handoff
    const altitudeDrop = act1FadeProgress * 7.5
    const camX = pointerX * 1.15 * (1 - act1FadeProgress * 0.6)
    const camY = 20.8 - altitudeDrop + pointerY * 0.65
    camera.position.set(camX, camY, cameraZ)
    camera.lookAt(camX * 0.35, 2.0 - act1FadeProgress * 1.1, cameraZ - 30)

    // Smoothly pull fog in at the end of Act 1 so handoff into Act 2 is 100% seamless
    const easeFog = act1FadeProgress * act1FadeProgress
    scene.fog.near = MathUtils.lerp(56, 0, easeFog)
    scene.fog.far = MathUtils.lerp(146, 3.2, easeFog)
  }

  function dispose() {
    sharedGeometries.forEach((g) => g.dispose())
  }

  return {
    scene,
    lights: { ambient, key, fill },
    update,
    dispose,
  }
}
