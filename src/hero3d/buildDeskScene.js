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

const MONITOR_RADIUS = 4.9
const MONITOR_HALF_ARC = 0.46 // total sweep 0.92 rad (~52.7 deg), ~32:9 ultrawide chord
const MONITOR_CENTER_Z = -0.18 // screen center at z = -0.18; arc center at z = -0.18 + R = 4.72
const ARC_ORIGIN_Z = MONITOR_CENTER_Z + MONITOR_RADIUS

const OUTER_TOP_Y = 1.72
const OUTER_BOT_Y = 0.34
const INNER_TOP_Y = 1.672
const INNER_BOT_Y = 0.412
const INNER_HALF_ARC = MONITOR_HALF_ARC * 0.955

function arcPoint(theta, radiusOffset, y, target = new Vector3()) {
  const r = MONITOR_RADIUS + radiusOffset
  target.set(r * Math.sin(theta), y, ARC_ORIGIN_Z - r * Math.cos(theta))
  return target
}

function createCurvedPatchGeometry(halfArc, segments, yBottom, yTop, radiusOffset, flipNormal = false) {
  const positions = []
  const indices = []

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const theta = -halfArc + t * halfArc * 2
    const pBot = arcPoint(theta, radiusOffset, yBottom)
    const pTop = arcPoint(theta, radiusOffset, yTop)
    positions.push(pBot.x, pBot.y, pBot.z, pTop.x, pTop.y, pTop.z)
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2
    const b = a + 1
    const c = a + 2
    const d = a + 3
    if (!flipNormal) {
      // Faces +Z (toward viewer inside concave arc)
      indices.push(a, c, b, b, c, d)
    } else {
      indices.push(a, b, c, b, d, c)
    }
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function createCurvedMonitorChassisGeometry(segments = 32) {
  // Closed solid curved housing shell between front bezel plane (offset 0) and rear shell (offset -0.11)
  // Note: because viewer is at +Z (toward ARC_ORIGIN_Z), smaller radius = closer to viewer (+Z),
  // larger radius (offset +0.11) = further behind screen (-Z)!
  const frontOff = 0.0
  const backOff = 0.11
  const positions = []
  const indices = []

  const pushQuad = (p0, p1, p2, p3) => {
    const base = positions.length / 3
    positions.push(
      p0.x, p0.y, p0.z,
      p1.x, p1.y, p1.z,
      p2.x, p2.y, p2.z,
      p3.x, p3.y, p3.z
    )
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }

  for (let i = 0; i < segments; i++) {
    const th0 = -MONITOR_HALF_ARC + (i / segments) * MONITOR_HALF_ARC * 2
    const th1 = -MONITOR_HALF_ARC + ((i + 1) / segments) * MONITOR_HALF_ARC * 2

    const fBot0 = arcPoint(th0, frontOff, OUTER_BOT_Y)
    const fBot1 = arcPoint(th1, frontOff, OUTER_BOT_Y)
    const fTop0 = arcPoint(th0, frontOff, OUTER_TOP_Y)
    const fTop1 = arcPoint(th1, frontOff, OUTER_TOP_Y)

    const bBot0 = arcPoint(th0, backOff, OUTER_BOT_Y + 0.02)
    const bBot1 = arcPoint(th1, backOff, OUTER_BOT_Y + 0.02)
    const bTop0 = arcPoint(th0, backOff, OUTER_TOP_Y - 0.015)
    const bTop1 = arcPoint(th1, backOff, OUTER_TOP_Y - 0.015)

    // Front face (bezel backdrop behind recessed screen)
    pushQuad(fBot0, fBot1, fTop1, fTop0)
    // Back face
    pushQuad(bBot1, bBot0, bTop0, bTop1)
    // Top rim (visible from elevated studio angle!)
    pushQuad(fTop0, fTop1, bTop1, bTop0)
    // Bottom rim
    pushQuad(bBot0, bBot1, fBot1, fBot0)

    if (i === 0) {
      // Left side cap
      pushQuad(bBot0, fBot0, fTop0, bTop0)
    }
    if (i === segments - 1) {
      // Right side cap
      pushQuad(fBot1, bBot1, bTop1, fTop1)
    }
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function pushSeg(arr, x1, y1, z1, x2, y2, z2) {
  arr.push(x1, y1, z1, x2, y2, z2)
}

function pushArcPolyline(arr, halfArc, segments, radiusOffset, y) {
  const p0 = new Vector3()
  const p1 = new Vector3()
  for (let i = 0; i < segments; i++) {
    const th0 = -halfArc + (i / segments) * halfArc * 2
    const th1 = -halfArc + ((i + 1) / segments) * halfArc * 2
    arcPoint(th0, radiusOffset, y, p0)
    arcPoint(th1, radiusOffset, y, p1)
    pushSeg(arr, p0.x, p0.y, p0.z, p1.x, p1.y, p1.z)
  }
}

function pushTransformedEdges(edgeAttr, targetArray, matrix) {
  const v = new Vector3()
  for (let i = 0; i < edgeAttr.count; i++) {
    v.fromBufferAttribute(edgeAttr, i).applyMatrix4(matrix)
    targetArray.push(v.x, v.y, v.z)
  }
}

export function buildDeskScene(materials) {
  const scene = new Scene()
  scene.fog = new Fog('#282828', 14, 38)

  const ambient = new AmbientLight('#ffffff', 0.82)
  const key = new DirectionalLight('#ffffff', 0.34)
  key.position.set(-6, 11, 9)
  const fill = new DirectionalLight('#ffffff', 0.14)
  fill.position.set(8, 5, 4)
  scene.add(ambient, key, fill)

  const geometries = []
  const trackGeo = (g) => {
    geometries.push(g)
    return g
  }

  const deskGroup = new Group()
  scene.add(deskGroup)

  const boxGeo = trackGeo(new BoxGeometry(1, 1, 1))
  const boxEdges = trackGeo(new EdgesGeometry(boxGeo, 15))

  const inkVerts = []
  const mutedVerts = []
  const gridVerts = []
  const screenArcVerts = []

  const tmpPos = new Vector3()
  const tmpQuat = new Quaternion()
  const tmpEuler = new Euler()
  const tmpScale = new Vector3()

  const addStaticBox = (mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, edgeMode = 'ink') => {
    const mesh = new Mesh(boxGeo, mat)
    mesh.position.set(x, y, z)
    mesh.rotation.set(rx, ry, rz)
    mesh.scale.set(sx, sy, sz)
    mesh.updateMatrix()
    deskGroup.add(mesh)

    if (edgeMode === 'ink') {
      pushTransformedEdges(boxEdges.attributes.position, inkVerts, mesh.matrix)
    } else if (edgeMode === 'muted') {
      pushTransformedEdges(boxEdges.attributes.position, mutedVerts, mesh.matrix)
    }
    return mesh
  }

  // 0. Subtle studio floor grid below desk for architectural spatial depth
  for (let gx = -16; gx <= 16; gx += 1.6) {
    pushSeg(gridVerts, gx, -1.32, -10, gx, -1.32, 10)
  }
  for (let gz = -10; gz <= 10; gz += 1.6) {
    pushSeg(gridVerts, -16, -1.32, gz, 16, -1.32, gz)
  }

  // 1. Wide Engineer's Desk Surface & Minimalist Frame (top of desk at y = 0)
  addStaticBox(materials.massDeep, 0, -0.055, 0.35, 7.6, 0.11, 2.95, 0, 0, 0, 'ink')
  // Under-bevel apron rail
  addStaticBox(materials.massMid, 0, -0.145, 0.35, 7.2, 0.07, 2.55, 0, 0, 0, 'muted')
  // Sleek steel sled legs
  for (const side of [-1, 1]) {
    const lx = side * 3.25
    addStaticBox(materials.massMid, lx, -0.72, -0.65, 0.12, 1.22, 0.12, 0, 0, 0, 'ink')
    addStaticBox(materials.massMid, lx, -0.72, 1.35, 0.12, 1.22, 0.12, 0, 0, 0, 'ink')
    addStaticBox(materials.massHigh, lx, -1.28, 0.35, 0.14, 0.08, 2.25, 0, 0, 0, 'ink')
  }
  // Rear cable tray modesty rail
  addStaticBox(materials.massMid, 0, -0.26, -0.82, 6.38, 0.1, 0.22, 0, 0, 0, 'muted')

  // Subtle architectural drafting ticks along outer desk surface
  for (let dx = -3.4; dx <= 3.4; dx += 0.85) {
    pushSeg(gridVerts, dx, 0.003, -1.08, dx, 0.003, 1.78)
  }
  for (let dz = -0.85; dz <= 1.55; dz += 0.6) {
    pushSeg(gridVerts, -3.75, 0.003, dz, 3.75, 0.003, dz)
  }

  // Precision Stitched Desk Mat
  addStaticBox(materials.massMid, 0, 0.008, 0.78, 3.75, 0.016, 1.26, 0, 0, 0, 'ink')
  // Inset stitched line on desk mat
  const matHW = 1.82
  const matHD = 0.58
  pushSeg(mutedVerts, -matHW, 0.019, 0.78 - matHD, matHW, 0.019, 0.78 - matHD)
  pushSeg(mutedVerts, matHW, 0.019, 0.78 - matHD, matHW, 0.019, 0.78 + matHD)
  pushSeg(mutedVerts, matHW, 0.019, 0.78 + matHD, -matHW, 0.019, 0.78 + matHD)
  pushSeg(mutedVerts, -matHW, 0.019, 0.78 + matHD, -matHW, 0.019, 0.78 - matHD)

  // 2. Minimalist Cast-Aluminum Monitor Stand & Riser Column
  // Swept V-wing base arms sitting cleanly on desk
  addStaticBox(materials.massHigh, -0.52, 0.024, -0.14, 1.18, 0.042, 0.14, 0, -0.34, 0, 'ink')
  addStaticBox(materials.massHigh, 0.52, 0.024, -0.14, 1.18, 0.042, 0.14, 0, 0.34, 0, 'ink')
  addStaticBox(materials.massHigh, 0, 0.032, -0.34, 0.38, 0.055, 0.28, 0, 0, 0, 'ink')
  // Vertical tapered riser column + cable pass-through ring
  addStaticBox(materials.massMid, 0, 0.58, -0.38, 0.22, 1.06, 0.13, -0.04, 0, 0, 'ink')
  addStaticBox(materials.massHigh, 0, 1.03, -0.31, 0.32, 0.24, 0.16, 0, 0, 0, 'ink')
  // Cable pass-through detail outline on riser
  pushSeg(inkVerts, -0.06, 0.22, -0.31, 0.06, 0.22, -0.31)
  pushSeg(inkVerts, 0.06, 0.22, -0.31, 0.06, 0.38, -0.31)
  pushSeg(inkVerts, 0.06, 0.38, -0.31, -0.06, 0.38, -0.31)
  pushSeg(inkVerts, -0.06, 0.38, -0.31, -0.06, 0.22, -0.31)

  // 3. 49" Super-Ultrawide Curved Monitor (32:9 Cylindrical Arc)
  const ARC_SEGS = 36
  const chassisGeo = trackGeo(createCurvedMonitorChassisGeometry(ARC_SEGS))
  const chassisMesh = new Mesh(chassisGeo, materials.massHigh)
  deskGroup.add(chassisMesh)

  // Recessed dark matte curved screen surface + raised curved front bezel strips
  const screenGeo = trackGeo(
    createCurvedPatchGeometry(INNER_HALF_ARC, ARC_SEGS, INNER_BOT_Y, INNER_TOP_Y, -0.003, false)
  )
  const screenMesh = new Mesh(screenGeo, materials.screenSurface)
  deskGroup.add(screenMesh)

  const topBezelGeo = trackGeo(
    createCurvedPatchGeometry(MONITOR_HALF_ARC, ARC_SEGS, INNER_TOP_Y, OUTER_TOP_Y, -0.008, false)
  )
  const chinBezelGeo = trackGeo(
    createCurvedPatchGeometry(MONITOR_HALF_ARC, ARC_SEGS, OUTER_BOT_Y, INNER_BOT_Y, -0.008, false)
  )
  deskGroup.add(
    new Mesh(topBezelGeo, materials.massMid),
    new Mesh(chinBezelGeo, materials.massMid)
  )

  // Sweeping crisp monochrome ink curves along outer chassis & inner bezel
  pushArcPolyline(inkVerts, MONITOR_HALF_ARC, ARC_SEGS, -0.002, OUTER_TOP_Y)
  pushArcPolyline(inkVerts, MONITOR_HALF_ARC, ARC_SEGS, -0.002, OUTER_BOT_Y)
  pushArcPolyline(inkVerts, MONITOR_HALF_ARC, ARC_SEGS, 0.11, OUTER_TOP_Y - 0.015)
  pushArcPolyline(mutedVerts, MONITOR_HALF_ARC, ARC_SEGS, 0.11, OUTER_BOT_Y + 0.02)

  // Inner bezel aperture curves
  pushArcPolyline(inkVerts, INNER_HALF_ARC, ARC_SEGS, -0.009, INNER_TOP_Y)
  pushArcPolyline(inkVerts, INNER_HALF_ARC, ARC_SEGS, -0.009, INNER_BOT_Y)
  // Subtle chin hairline & center power LED tick
  pushArcPolyline(mutedVerts, MONITOR_HALF_ARC * 0.98, ARC_SEGS, -0.003, OUTER_BOT_Y + 0.036)
  pushSeg(inkVerts, -0.035, OUTER_BOT_Y + 0.036, MONITOR_CENTER_Z + 0.006, 0.035, OUTER_BOT_Y + 0.036, MONITOR_CENTER_Z + 0.006)

  // Left & Right vertical curved bezel endcaps + inner screen stiles
  for (const sign of [-1, 1]) {
    const fTop = arcPoint(sign * MONITOR_HALF_ARC, -0.002, OUTER_TOP_Y)
    const fBot = arcPoint(sign * MONITOR_HALF_ARC, -0.002, OUTER_BOT_Y)
    const bTop = arcPoint(sign * MONITOR_HALF_ARC, 0.11, OUTER_TOP_Y - 0.015)
    const bBot = arcPoint(sign * MONITOR_HALF_ARC, 0.11, OUTER_BOT_Y + 0.02)
    pushSeg(inkVerts, fTop.x, fTop.y, fTop.z, fBot.x, fBot.y, fBot.z)
    pushSeg(inkVerts, bTop.x, bTop.y, bTop.z, bBot.x, bBot.y, bBot.z)
    pushSeg(inkVerts, fTop.x, fTop.y, fTop.z, bTop.x, bTop.y, bTop.z)
    pushSeg(inkVerts, fBot.x, fBot.y, fBot.z, bBot.x, bBot.y, bBot.z)

    const iTop = arcPoint(sign * INNER_HALF_ARC, -0.009, INNER_TOP_Y)
    const iBot = arcPoint(sign * INNER_HALF_ARC, -0.009, INNER_BOT_Y)
    pushSeg(inkVerts, iTop.x, iTop.y, iTop.z, iBot.x, iBot.y, iBot.z)
  }

  // Subtle curved telemetry guide arcs inside the 49" display glass so curvature is palpable
  for (const fracY of [0.22, 0.5, 0.78]) {
    const gy = MathUtils.lerp(INNER_BOT_Y, INNER_TOP_Y, fracY)
    pushArcPolyline(screenArcVerts, INNER_HALF_ARC * 0.96, ARC_SEGS, -0.011, gy)
  }
  for (const fracTh of [-0.66, -0.33, 0, 0.33, 0.66]) {
    const th = fracTh * INNER_HALF_ARC
    const sTop = arcPoint(th, -0.011, INNER_TOP_Y - 0.06)
    const sBot = arcPoint(th, -0.011, INNER_BOT_Y + 0.06)
    pushSeg(screenArcVerts, sTop.x, sTop.y, sTop.z, sBot.x, sBot.y, sBot.z)
  }

  // 4. ZSA Voyager Split Ergonomic Keyboard (2 ultra-thin halves, 6x4 columnar stagger + 2-key thumb clusters = 52 keys)
  const createVoyagerHalfPlate = (mirrorX) => {
    // CW outline in (x, z) for left half; mirrored & reversed for right half so normals stay outward
    const baseOutline = [
      [-0.258, -0.146],
      [-0.082, -0.172],
      [0.041, -0.204],
      [0.165, -0.184],
      [0.254, -0.164],
      [0.254, 0.118],
      [0.348, 0.204],
      [0.312, 0.304],
      [0.156, 0.268],
      [0.122, 0.178],
      [-0.082, 0.178],
      [-0.258, 0.194],
    ]
    const poly = mirrorX
      ? baseOutline.map(([x, z]) => [-x, z]).reverse()
      : baseOutline

    const idx = poly.map((_, i) => i)
    const tris = []
    const cross2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    const inTri2 = (p, a, b, c) =>
      cross2(a, b, p) >= 0 && cross2(b, c, p) >= 0 && cross2(c, a, p) >= 0
    let guard = 0
    while (idx.length > 3 && guard++ < 200) {
      for (let i = 0; i < idx.length; i++) {
        const i0 = idx[(i - 1 + idx.length) % idx.length]
        const i1 = idx[i]
        const i2 = idx[(i + 1) % idx.length]
        const a = poly[i0]
        const b = poly[i1]
        const c = poly[i2]
        if (cross2(a, b, c) <= 1e-7) continue
        let ear = true
        for (let j = 0; j < idx.length; j++) {
          const ij = idx[j]
          if (ij === i0 || ij === i1 || ij === i2) continue
          if (inTri2(poly[ij], a, b, c)) {
            ear = false
            break
          }
        }
        if (ear) {
          tris.push([i0, i1, i2])
          idx.splice(i, 1)
          break
        }
      }
    }
    tris.push([idx[0], idx[1], idx[2]])

    const hy = 0.0125 // ultra-thin 0.025 total plate thickness
    const pos = []
    const addTri = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
      pos.push(ax, ay, az, bx, by, bz, cx, cy, cz)
    }
    for (const [i0, i1, i2] of tris) {
      const [x0, z0] = poly[i0]
      const [x1, z1] = poly[i1]
      const [x2, z2] = poly[i2]
      // Top cap (+Y normal)
      addTri(x0, hy, z0, x2, hy, z2, x1, hy, z1)
      // Bottom cap (-Y normal)
      addTri(x0, -hy, z0, x1, -hy, z1, x2, -hy, z2)
    }
    for (let i = 0; i < poly.length; i++) {
      const [x0, z0] = poly[i]
      const [x1, z1] = poly[(i + 1) % poly.length]
      addTri(x0, -hy, z0, x0, hy, z0, x1, hy, z1)
      addTri(x0, -hy, z0, x1, hy, z1, x1, -hy, z1)
    }
    const g = trackGeo(new BufferGeometry())
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()
    return g
  }

  const pushCubicCurve = (arr, p0, p1, p2, p3, segs = 20) => {
    let prevX = p0.x
    let prevY = p0.y
    let prevZ = p0.z
    for (let i = 1; i <= segs; i++) {
      const t = i / segs
      const u = 1 - t
      const b0 = u * u * u
      const b1 = 3 * u * u * t
      const b2 = 3 * u * t * t
      const b3 = t * t * t
      const nx = b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x
      const ny = b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y
      const nz = b0 * p0.z + b1 * p1.z + b2 * p2.z + b3 * p3.z
      pushSeg(arr, prevX, prevY, prevZ, nx, ny, nz)
      prevX = nx
      prevY = ny
      prevZ = nz
    }
  }

  const voyagerHalves = [
    { mirrorX: false, cx: -0.6, cz: 0.78, rotY: -0.17, tentZ: 0.035 }, // Left half angled slightly inward
    { mirrorX: true, cx: 0.28, cz: 0.78, rotY: 0.17, tentZ: -0.035 },  // Right half angled slightly inward
  ]
  const colStaggerZ = [0.026, 0.022, -0.014, -0.032, -0.012, 0.006]
  const keyPitch = 0.082
  const keyMatrices = []
  const trrsPorts = []
  let leftUsbPort = null

  for (const half of voyagerHalves) {
    const sign = half.mirrorX ? -1 : 1
    const plateGeo = createVoyagerHalfPlate(half.mirrorX)
    const plateEdges = trackGeo(new EdgesGeometry(plateGeo, 15))
    const halfQuat = new Quaternion().setFromEuler(new Euler(0.035, half.rotY, half.tentZ))

    const plateMesh = new Mesh(plateGeo, materials.massHigh)
    plateMesh.position.set(half.cx, 0.032, half.cz)
    plateMesh.quaternion.copy(halfQuat)
    plateMesh.updateMatrix()
    deskGroup.add(plateMesh)
    pushTransformedEdges(plateEdges.attributes.position, inkVerts, plateMesh.matrix)

    const toWorld = (lx, ly, lz) =>
      new Vector3(lx, ly, lz).applyQuaternion(halfQuat).add(plateMesh.position)

    // 6-column x 4-row columnar-staggered low-profile square Choc keycaps (24 keys per half)
    for (let c = 0; c < 6; c++) {
      const lx = sign * (-2.5 * keyPitch + c * keyPitch)
      const stag = colStaggerZ[c]
      for (let r = 0; r < 4; r++) {
        const lz = (-1.5 + r) * keyPitch + stag
        const wPos = toWorld(lx, 0.021, lz)
        tmpScale.set(0.067, 0.017, 0.067)
        keyMatrices.push(new Matrix4().compose(wPos, halfQuat, tmpScale))
      }
    }

    // Signature 2-key angled thumb cluster tucked at inner-bottom edge (2 keys per half)
    const thumbSpecs = [
      { lx: 0.204, lz: 0.206, localRy: -0.26, sz: 0.09 },
      { lx: 0.282, lz: 0.238, localRy: -0.44, sz: 0.096 },
    ]
    for (const tk of thumbSpecs) {
      const wPos = toWorld(sign * tk.lx, 0.021, tk.lz)
      const thumbQuat = halfQuat
        .clone()
        .multiply(new Quaternion().setFromEuler(new Euler(0, sign * tk.localRy, 0)))
      tmpScale.set(0.068, 0.017, tk.sz)
      keyMatrices.push(new Matrix4().compose(wPos, thumbQuat, tmpScale))
    }

    // Subtle status LED indicator ticks along inner column header
    const ledA = toWorld(sign * 0.235, 0.014, -0.12)
    const ledB = toWorld(sign * 0.235, 0.014, -0.06)
    pushSeg(inkVerts, ledA.x, ledA.y, ledA.z, ledB.x, ledB.y, ledB.z)

    // TRRS barrel jack housing on inner top edge of each half
    const trrsWorld = toWorld(sign * 0.215, 0.004, -0.178)
    addStaticBox(materials.massMid, trrsWorld.x, trrsWorld.y, trrsWorld.z, 0.032, 0.022, 0.048, 0, half.rotY, 0, 'ink')
    trrsPorts.push({
      tip: toWorld(sign * 0.215, 0.004, -0.204),
      tangent: toWorld(sign * 0.25, 0.002, -0.34),
    })

    if (!half.mirrorX) {
      // USB-C port plug on top outer-mid edge of left half
      const usbHousing = toWorld(-0.145, 0.004, -0.184)
      addStaticBox(materials.massMid, usbHousing.x, usbHousing.y, usbHousing.z, 0.038, 0.02, 0.046, 0, half.rotY, 0, 'ink')
      leftUsbPort = {
        tip: toWorld(-0.145, 0.004, -0.208),
        ctrl: toWorld(-0.16, 0.002, -0.44),
      }
    }
  }

  const keycapMesh = new InstancedMesh(boxGeo, materials.massMid, keyMatrices.length)
  for (let i = 0; i < keyMatrices.length; i++) {
    keycapMesh.setMatrixAt(i, keyMatrices[i])
    pushTransformedEdges(boxEdges.attributes.position, inkVerts, keyMatrices[i])
  }
  keycapMesh.instanceMatrix.needsUpdate = true
  deskGroup.add(keycapMesh)

  // Thin curved TRRS interconnect cable looping cleanly between inner top edges of the two Voyager halves
  pushCubicCurve(
    inkVerts,
    trrsPorts[0].tip,
    new Vector3(trrsPorts[0].tangent.x, 0.022, trrsPorts[0].tangent.z),
    new Vector3(trrsPorts[1].tangent.x, 0.022, trrsPorts[1].tangent.z),
    trrsPorts[1].tip,
    22
  )

  // Subtle curved USB-C cord from left Voyager half up toward the monitor stand cable pass-through
  if (leftUsbPort) {
    const deskEntry = new Vector3(0, 0.024, -0.05)
    pushCubicCurve(
      inkVerts,
      leftUsbPort.tip,
      new Vector3(leftUsbPort.ctrl.x, 0.022, leftUsbPort.ctrl.z),
      new Vector3(-0.18, 0.022, 0.14),
      deskEntry,
      18
    )
    pushSeg(inkVerts, deskEntry.x, deskEntry.y, deskEntry.z, 0, 0.22, -0.31)
  }

  // 5. Sculpted Logitech MX Master 4 Right-Hand Ergonomic Mouse on right side of desk mat
  // Local mouse frame at (msX, msBaseY, msZ), rotated slightly inward toward typist:
  // -Z = front click paddles, +Z = rear palm heel, -X = flared left thumb wing + thumb wheel, +X = sloped right flank
  const msX = 1.02
  const msBaseY = 0.016
  const msZ = 0.82
  const msRotY = 0.1
  const msQuat = new Quaternion().setFromEuler(new Euler(0, msRotY, 0))
  const msOrigin = new Vector3(msX, msBaseY, msZ)
  const msScale = 1.12
  const msMatrix = new Matrix4().compose(msOrigin, msQuat, new Vector3(msScale, msScale, msScale))

  const toMouseWorld = (lx, ly, lz) =>
    new Vector3(lx * msScale, ly * msScale, lz * msScale).applyQuaternion(msQuat).add(msOrigin)

  // 5a. Asymmetric Base Skirt with Signature Flared Lower-Left Thumb-Rest Wing
  const buildFlatPlateXZ = (polyCW, yBottom, yTop) => {
    const idx = polyCW.map((_, i) => i)
    const tris = []
    const cross2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    const inTri2 = (p, a, b, c) =>
      cross2(a, b, p) >= 0 && cross2(b, c, p) >= 0 && cross2(c, a, p) >= 0
    let guard = 0
    while (idx.length > 3 && guard++ < 200) {
      for (let i = 0; i < idx.length; i++) {
        const i0 = idx[(i - 1 + idx.length) % idx.length]
        const i1 = idx[i]
        const i2 = idx[(i + 1) % idx.length]
        const a = polyCW[i0]
        const b = polyCW[i1]
        const c = polyCW[i2]
        if (cross2(a, b, c) <= 1e-7) continue
        let ear = true
        for (let j = 0; j < idx.length; j++) {
          const ij = idx[j]
          if (ij === i0 || ij === i1 || ij === i2) continue
          if (inTri2(polyCW[ij], a, b, c)) {
            ear = false
            break
          }
        }
        if (ear) {
          tris.push([i0, i1, i2])
          idx.splice(i, 1)
          break
        }
      }
    }
    tris.push([idx[0], idx[1], idx[2]])

    const pos = []
    const addTri = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
      pos.push(ax, ay, az, bx, by, bz, cx, cy, cz)
    }
    for (const [i0, i1, i2] of tris) {
      const [x0, z0] = polyCW[i0]
      const [x1, z1] = polyCW[i1]
      const [x2, z2] = polyCW[i2]
      addTri(x0, yTop, z0, x2, yTop, z2, x1, yTop, z1)
      addTri(x0, yBottom, z0, x1, yBottom, z1, x2, yBottom, z2)
    }
    for (let i = 0; i < polyCW.length; i++) {
      const [x0, z0] = polyCW[i]
      const [x1, z1] = polyCW[(i + 1) % polyCW.length]
      addTri(x0, yBottom, z0, x0, yTop, z0, x1, yTop, z1)
      addTri(x0, yBottom, z0, x1, yTop, z1, x1, yBottom, z1)
    }
    const g = trackGeo(new BufferGeometry())
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()
    return g
  }

  // CW footprint in (lx, lz): flared lower-left thumb wing on -X, tapered nose at -Z, ergonomic right curve on +X
  const mxBaseFootprint = [
    [-0.098, -0.218], // front-left nose
    [0.015, -0.226],  // center nose tip
    [0.104, -0.212],  // front-right nose
    [0.128, -0.085],  // right fore flank
    [0.132, 0.055],   // right mid flank
    [0.108, 0.175],   // rear-right heel
    [0.032, 0.228],   // rear heel apex
    [-0.068, 0.215],  // rear-left heel
    [-0.128, 0.162],  // thumb-wing rear sweep
    [-0.192, 0.092],  // flared lower-left thumb-rest wing peak!
    [-0.186, 0.005],  // thumb-rest wing fore lip
    [-0.122, -0.072], // thumb-wing neck tuck
    [-0.108, -0.155], // left fore flank
  ]
  const mxBaseGeo = buildFlatPlateXZ(mxBaseFootprint, 0.0, 0.018)
  const mxBaseEdges = trackGeo(new EdgesGeometry(mxBaseGeo, 15))
  const mxBaseMesh = new Mesh(mxBaseGeo, materials.massDeep)
  mxBaseMesh.applyMatrix4(msMatrix)
  mxBaseMesh.updateMatrix()
  deskGroup.add(mxBaseMesh)
  pushTransformedEdges(mxBaseEdges.attributes.position, inkVerts, mxBaseMesh.matrix)

  // Subtle Gesture button accent line on the flared lower-left thumb-rest wing
  const gestA = toMouseWorld(-0.168, 0.02, 0.068)
  const gestB = toMouseWorld(-0.164, 0.02, 0.022)
  pushSeg(inkVerts, gestA.x, gestA.y, gestA.z, gestB.x, gestB.y, gestB.z)

  // 5b. Multi-Station Lofted Asymmetric Arched Palm Dome (high left-biased crest banking down to right)
  // Cross-section points in CW (lx, ly) order from rear heel (z = +0.22) forward to button collar (z = -0.048)
  const domeStations = [
    {
      z: 0.218,
      pts: [
        [-0.062, 0.018],
        [-0.068, 0.028],
        [-0.058, 0.042],
        [-0.015, 0.048],
        [0.038, 0.044],
        [0.078, 0.032],
        [0.082, 0.018],
      ],
    },
    {
      z: 0.165,
      pts: [
        [-0.098, 0.018],
        [-0.102, 0.046],
        [-0.092, 0.076],
        [-0.026, 0.092],
        [0.048, 0.078],
        [0.104, 0.05],
        [0.112, 0.018],
      ],
    },
    {
      z: 0.09,
      pts: [
        [-0.104, 0.018],
        [-0.096, 0.052], // concave thumb cove tuck!
        [-0.114, 0.088], // upper-left thumb ridge overhang!
        [-0.032, 0.118], // tall left-biased ergonomic palm peak!
        [0.052, 0.098],  // banking right slope
        [0.118, 0.06],
        [0.126, 0.018],
      ],
    },
    {
      z: 0.015,
      pts: [
        [-0.106, 0.018],
        [-0.094, 0.052], // concave thumb cove
        [-0.118, 0.086], // upper-left thumb ridge housing side buttons & thumb wheel
        [-0.03, 0.116],  // ergonomic crest
        [0.054, 0.096],
        [0.118, 0.058],
        [0.126, 0.018],
      ],
    },
    {
      z: -0.052,
      pts: [
        [-0.104, 0.018],
        [-0.098, 0.048],
        [-0.11, 0.078],
        [-0.026, 0.098],
        [0.05, 0.084],
        [0.112, 0.052],
        [0.122, 0.018],
      ],
    },
  ]

  const buildLoftedDome = (stations) => {
    const pos = []
    const addTri = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
      pos.push(ax, ay, az, bx, by, bz, cx, cy, cz)
    }
    const ringLen = stations[0].pts.length

    for (let s = 0; s < stations.length - 1; s++) {
      const st0 = stations[s]
      const st1 = stations[s + 1]
      for (let p = 0; p < ringLen; p++) {
        const pn = (p + 1) % ringLen
        const [ax, ay] = st0.pts[p]
        const [bx, by] = st0.pts[pn]
        const [cx, cy] = st1.pts[p]
        const [dx, dy] = st1.pts[pn]
        addTri(ax, ay, st0.z, bx, by, st0.z, dx, dy, st1.z)
        addTri(ax, ay, st0.z, dx, dy, st1.z, cx, cy, st1.z)
      }
    }

    // Rear cap (+Z normal) & front collar cap (-Z normal)
    const capStation = (st, flip) => {
      let cx = 0
      let cy = 0
      for (const [px, py] of st.pts) {
        cx += px
        cy += py
      }
      cx /= ringLen
      cy /= ringLen
      for (let p = 0; p < ringLen; p++) {
        const pn = (p + 1) % ringLen
        const [x0, y0] = st.pts[p]
        const [x1, y1] = st.pts[pn]
        if (flip) {
          addTri(cx, cy, st.z, x1, y1, st.z, x0, y0, st.z)
        } else {
          addTri(cx, cy, st.z, x0, y0, st.z, x1, y1, st.z)
        }
      }
    }
    capStation(stations[0], true)
    capStation(stations[stations.length - 1], false)

    const g = trackGeo(new BufferGeometry())
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()
    return g
  }

  const mxDomeGeo = buildLoftedDome(domeStations)
  const mxDomeMesh = new Mesh(mxDomeGeo, materials.massMid)
  mxDomeMesh.applyMatrix4(msMatrix)
  mxDomeMesh.updateMatrix()
  deskGroup.add(mxDomeMesh)

  // Crisp sculptural feature seams along the MX Master 4 palm dome (thumb ridge, dorsal crest, right flank, & front/rear arches)
  for (const ridgeIdx of [1, 2, 3, 5]) {
    const lineTarget = ridgeIdx === 1 ? mutedVerts : inkVerts
    for (let s = 0; s < domeStations.length - 1; s++) {
      const a = toMouseWorld(
        domeStations[s].pts[ridgeIdx][0],
        domeStations[s].pts[ridgeIdx][1] + 0.001,
        domeStations[s].z
      )
      const b = toMouseWorld(
        domeStations[s + 1].pts[ridgeIdx][0],
        domeStations[s + 1].pts[ridgeIdx][1] + 0.001,
        domeStations[s + 1].z
      )
      pushSeg(lineTarget, a.x, a.y, a.z, b.x, b.y, b.z)
    }
  }
  // Collar arch seam where palm dome meets the split click paddles + rear heel arch
  for (const archStation of [domeStations[0], domeStations[domeStations.length - 1]]) {
    for (let p = 1; p < archStation.pts.length - 1; p++) {
      const a = toMouseWorld(archStation.pts[p][0], archStation.pts[p][1] + 0.001, archStation.z)
      const b = toMouseWorld(archStation.pts[p + 1][0], archStation.pts[p + 1][1] + 0.001, archStation.z)
      pushSeg(inkVerts, a.x, a.y, a.z, b.x, b.y, b.z)
    }
  }

  // 5c. Sloping Split Left & Right Click Paddles + Center MagSpeed Channel
  const addMousePart = (geo, edgesGeo, mat, lx, ly, lz, sx, sy, sz, rx = 0, ry = 0, rz = 0, edgeArr = inkVerts) => {
    const localQuat = msQuat.clone().multiply(new Quaternion().setFromEuler(new Euler(rx, ry, rz)))
    const wPos = toMouseWorld(lx, ly, lz)
    const mesh = new Mesh(geo, mat)
    mesh.position.copy(wPos)
    mesh.quaternion.copy(localQuat)
    mesh.scale.set(sx * msScale, sy * msScale, sz * msScale)
    mesh.updateMatrix()
    deskGroup.add(mesh)
    if (edgesGeo) {
      pushTransformedEdges(edgesGeo.attributes.position, edgeArr, mesh.matrix)
    }
    return mesh
  }

  // Fore under-chassis block beneath the split click paddles
  addMousePart(boxGeo, boxEdges, materials.massDeep, 0.004, 0.032, -0.132, 0.205, 0.03, 0.16, -0.14, 0, -0.08, mutedVerts)

  // Left click paddle (higher index-finger side, steeply sloped forward toward -Z)
  addMousePart(boxGeo, boxEdges, materials.massHigh, -0.056, 0.064, -0.134, 0.078, 0.015, 0.164, -0.32, 0.02, -0.09, inkVerts)
  // Right click paddle (banked lower on right side, steeply sloped forward toward -Z)
  addMousePart(boxGeo, boxEdges, materials.massHigh, 0.062, 0.054, -0.132, 0.08, 0.015, 0.16, -0.32, -0.03, -0.17, inkVerts)

  // 5d. Prominent Machined Top MagSpeed Scroll Wheel + Mode-Shift Button in Center Groove
  const wheelCylGeo = trackGeo(new CylinderGeometry(0.5, 0.5, 1, 14))
  const wheelCylEdges = trackGeo(new EdgesGeometry(wheelCylGeo, 20))
  // Upright wheel cylinder (axis along local X -> rz = Math.PI / 2)
  addMousePart(
    wheelCylGeo,
    wheelCylEdges,
    materials.massHigh,
    0.003,
    0.074,
    -0.132,
    0.058,
    0.024,
    0.058,
    0,
    0,
    Math.PI / 2,
    inkVerts
  )
  // Mode-shift button behind MagSpeed wheel
  addMousePart(boxGeo, boxEdges, materials.massHigh, 0.002, 0.089, -0.076, 0.022, 0.012, 0.03, -0.24, 0, -0.1, inkVerts)

  // 5e. Signature Horizontal Thumb Scroll Wheel + Two Side Buttons on Upper-Left Thumb Ridge
  // Horizontal barrel thumb wheel (cylinder axis along fore-aft Z -> rx = Math.PI / 2)
  addMousePart(
    wheelCylGeo,
    wheelCylEdges,
    materials.massHigh,
    -0.112,
    0.071,
    -0.032,
    0.034,
    0.052,
    0.034,
    Math.PI / 2,
    0.06,
    0,
    inkVerts
  )
  // Forward & Back side buttons tucked right behind the horizontal thumb wheel
  addMousePart(boxGeo, boxEdges, materials.massHigh, -0.113, 0.064, 0.018, 0.018, 0.013, 0.034, 0, 0.05, 0.12, inkVerts)
  addMousePart(boxGeo, boxEdges, materials.massHigh, -0.111, 0.062, 0.058, 0.018, 0.013, 0.034, 0, 0.05, 0.12, inkVerts)

  // 6. Closed Field Notebook & Technical Pen on left desk wing (nod to Field Notes)
  const nbX = -2.42
  const nbZ = 0.68
  const nbRot = 0.14
  addStaticBox(materials.massMid, nbX, 0.036, nbZ, 0.66, 0.052, 0.92, 0, nbRot, 0, 'ink')
  addStaticBox(materials.massHigh, nbX - 0.28, 0.038, nbZ + 0.04, 0.09, 0.056, 0.922, 0, nbRot, 0, 'ink')
  // Drafting pen beside notebook
  addStaticBox(materials.massHigh, nbX + 0.46, 0.026, nbZ + 0.02, 0.032, 0.032, 0.72, 0, nbRot - 0.06, 0, 'ink')

  // 7. Ceramic Mug of Steaming Coffee on a Thin Round Coaster (right of the MX Master 4 mouse)
  const mugX = 1.62
  const mugZ = 0.86
  const deskSurfaceAtMugY = 0.016 // sits cleanly on right side of desk mat next to MX Master 4 mouse
  const pushCircleXZ = (arr, cx, y, cz, radius, segs = 28, startAngle = 0, endAngle = Math.PI * 2) => {
    for (let i = 0; i < segs; i++) {
      const a0 = startAngle + (i / segs) * (endAngle - startAngle)
      const a1 = startAngle + ((i + 1) / segs) * (endAngle - startAngle)
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

  // 7a. Thin round coaster resting next to the mouse
  const coasterR = 0.24
  const coasterH = 0.015
  const coasterGeo = trackGeo(new CylinderGeometry(coasterR, coasterR * 1.02, coasterH, 28))
  const coasterMesh = new Mesh(coasterGeo, materials.massDeep)
  coasterMesh.position.set(mugX, deskSurfaceAtMugY + coasterH / 2, mugZ)
  deskGroup.add(coasterMesh)
  pushCircleXZ(inkVerts, mugX, deskSurfaceAtMugY + coasterH + 0.002, mugZ, coasterR, 28)
  pushCircleXZ(mutedVerts, mugX, deskSurfaceAtMugY + coasterH + 0.003, mugZ, coasterR * 0.82, 24)

  // 7b. Hollow-rimmed cylindrical ceramic mug + dark coffee surface inside
  const mugOuterR = 0.165
  const mugInnerR = 0.138
  const mugBaseY = deskSurfaceAtMugY + coasterH + 0.001
  const mugTopY = mugBaseY + 0.32
  const coffeeY = mugTopY - 0.052

  const buildCeramicMugGeometry = () => {
    const segs = 28
    const pos = []
    const addTri = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
      pos.push(ax, ay, az, bx, by, bz, cx, cy, cz)
    }
    const addQuad = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
      addTri(ax, ay, az, bx, by, bz, cx, cy, cz)
      addTri(ax, ay, az, cx, cy, cz, dx, dy, dz)
    }

    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2
      const a1 = ((i + 1) / segs) * Math.PI * 2
      const c0 = Math.cos(a0)
      const s0 = Math.sin(a0)
      const c1 = Math.cos(a1)
      const s1 = Math.sin(a1)

      const ox0 = mugX + c0 * mugOuterR
      const oz0 = mugZ + s0 * mugOuterR
      const ox1 = mugX + c1 * mugOuterR
      const oz1 = mugZ + s1 * mugOuterR

      const bx0 = mugX + c0 * (mugOuterR * 0.95)
      const bz0 = mugZ + s0 * (mugOuterR * 0.95)
      const bx1 = mugX + c1 * (mugOuterR * 0.95)
      const bz1 = mugZ + s1 * (mugOuterR * 0.95)

      const ix0 = mugX + c0 * mugInnerR
      const iz0 = mugZ + s0 * mugInnerR
      const ix1 = mugX + c1 * mugInnerR
      const iz1 = mugZ + s1 * mugInnerR

      // Outer cylindrical wall (outward normal)
      addQuad(bx0, mugBaseY, bz0, ox0, mugTopY, oz0, ox1, mugTopY, oz1, bx1, mugBaseY, bz1)
      // Top ceramic rim annulus (+Y normal)
      addQuad(ix0, mugTopY, iz0, ix1, mugTopY, iz1, ox1, mugTopY, oz1, ox0, mugTopY, oz0)
      // Inner ceramic wall above dark coffee surface (inward normal)
      addQuad(ix0, coffeeY, iz0, ix1, coffeeY, iz1, ix1, mugTopY, iz1, ix0, mugTopY, iz0)
    }

    const g = trackGeo(new BufferGeometry())
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()
    return g
  }

  const mugMesh = new Mesh(buildCeramicMugGeometry(), materials.massHigh)
  deskGroup.add(mugMesh)

  // Dark coffee liquid disc inside the mug
  const coffeeGeo = trackGeo(new CylinderGeometry(mugInnerR * 0.995, mugInnerR * 0.995, 0.006, 28))
  const coffeeMesh = new Mesh(coffeeGeo, materials.coffeeSurface)
  coffeeMesh.position.set(mugX, coffeeY, mugZ)
  deskGroup.add(coffeeMesh)

  // Crisp architectural rim, base, silhouette, and coffee meniscus lines
  pushCircleXZ(inkVerts, mugX, mugTopY + 0.001, mugZ, mugOuterR, 28)
  pushCircleXZ(inkVerts, mugX, mugTopY + 0.001, mugZ, mugInnerR, 28)
  pushCircleXZ(inkVerts, mugX, mugBaseY + 0.002, mugZ, mugOuterR * 0.95, 28)
  pushCircleXZ(mutedVerts, mugX, coffeeY + 0.004, mugZ, mugInnerR * 0.92, 24)
  pushCircleXZ(mutedVerts, mugX, coffeeY + 0.004, mugZ, mugInnerR * 0.52, 16, 0.4, 2.5)

  // 7c. Sculpted D-Shaped Ceramic Handle angled in clear right-front 3/4 profile
  const handleYaw = -0.3
  const hDirX = Math.cos(handleYaw)
  const hDirZ = Math.sin(handleYaw)
  const handleSegs = 12
  const handleMidY = (mugBaseY + mugTopY) * 0.51
  const handleHalfSpanY = 0.108
  const handleOutReach = 0.108
  const handleBoxThick = 0.028
  const handleBoxWidth = 0.034

  const handleSpine = []
  for (let i = 0; i <= handleSegs; i++) {
    const t = i / handleSegs
    const ang = -Math.PI / 2 + t * Math.PI
    const radialOut = mugOuterR - 0.008 + Math.pow(Math.cos(ang), 0.78) * handleOutReach
    const hy = handleMidY + Math.sin(ang) * handleHalfSpanY
    handleSpine.push(new Vector3(mugX + hDirX * radialOut, hy, mugZ + hDirZ * radialOut))
  }
  for (let i = 0; i < handleSegs; i++) {
    const p0 = handleSpine[i]
    const p1 = handleSpine[i + 1]
    const mid = p0.clone().add(p1).multiplyScalar(0.5)
    const segVec = p1.clone().sub(p0)
    const segLen = segVec.length() + 0.006
    const hQuat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), segVec.normalize())
    // Align handle width perpendicular to handle plane
    const yawQuat = new Quaternion().setFromEuler(new Euler(0, -handleYaw, 0))
    hQuat.multiply(yawQuat)
    const segMesh = new Mesh(boxGeo, materials.massHigh)
    segMesh.position.copy(mid)
    segMesh.quaternion.copy(hQuat)
    segMesh.scale.set(handleBoxThick, segLen, handleBoxWidth)
    deskGroup.add(segMesh)

    // Crisp outer and inner D-handle profile curves
    const outOff = 0.015
    pushSeg(
      inkVerts,
      p0.x + hDirX * outOff,
      p0.y,
      p0.z + hDirZ * outOff,
      p1.x + hDirX * outOff,
      p1.y,
      p1.z + hDirZ * outOff
    )
    pushSeg(
      inkVerts,
      p0.x - hDirX * outOff,
      p0.y,
      p0.z - hDirZ * outOff,
      p1.x - hDirX * outOff,
      p1.y,
      p1.z - hDirZ * outOff
    )
  }

  // 7d. Animated Rising Monochrome Ink Steam Wisps (3 gentle S-curves; static when prefers-reduced-motion)
  const wispSpecs = [
    { dx: -0.052, dz: 0.015, height: 0.36, amp: 0.042, speed: 1.85, phase: 0.35 },
    { dx: 0.004, dz: -0.018, height: 0.44, amp: 0.048, speed: 1.65, phase: 2.45 },
    { dx: 0.054, dz: 0.012, height: 0.33, amp: 0.038, speed: 2.05, phase: 4.55 },
  ]
  const WISP_SEGS = 18
  const SPLIT_SEG = 12 // lower/mid segments in bright inkLine, upper dissipating curl in mutedLine
  const steamInkGeo = trackGeo(new BufferGeometry())
  const steamInkAttr = new Float32BufferAttribute(new Float32Array(wispSpecs.length * SPLIT_SEG * 4 * 3), 3)
  steamInkAttr.setUsage(DynamicDrawUsage)
  steamInkGeo.setAttribute('position', steamInkAttr)
  const steamInkLines = new LineSegments(steamInkGeo, materials.inkLine)
  steamInkLines.frustumCulled = false
  deskGroup.add(steamInkLines)

  const steamMutedGeo = trackGeo(new BufferGeometry())
  const steamMutedAttr = new Float32BufferAttribute(
    new Float32Array(wispSpecs.length * (WISP_SEGS - SPLIT_SEG) * 2 * 3),
    3
  )
  steamMutedAttr.setUsage(DynamicDrawUsage)
  steamMutedGeo.setAttribute('position', steamMutedAttr)
  const steamMutedLines = new LineSegments(steamMutedGeo, materials.mutedLine)
  steamMutedLines.frustumCulled = false
  deskGroup.add(steamMutedLines)

  const updateSteamWisps = (time) => {
    const inkArr = steamInkAttr.array
    const mutedArr = steamMutedAttr.array
    let inkIdx = 0
    let mutedIdx = 0
    const baseY = coffeeY + 0.02

    const sampleWisp = (spec, s, out) => {
      const env = Math.pow(s, 0.82) * (1 - 0.16 * s * s)
      const wave = s * 5.8 - time * spec.speed + spec.phase
      out.x = mugX + spec.dx + Math.sin(wave) * spec.amp * env + s * 0.012
      out.y = baseY + s * spec.height
      out.z = mugZ + spec.dz + Math.cos(wave * 0.85 + 0.7) * spec.amp * 0.6 * env
    }

    const pA = { x: 0, y: 0, z: 0 }
    const pB = { x: 0, y: 0, z: 0 }
    for (let w = 0; w < wispSpecs.length; w++) {
      const spec = wispSpecs[w]
      for (let i = 0; i < WISP_SEGS; i++) {
        const s0 = i / WISP_SEGS
        sampleWisp(spec, s0, pA)
        sampleWisp(spec, (i + 1) / WISP_SEGS, pB)
        if (i < SPLIT_SEG) {
          // Crisp twin-hairline rib on lower/mid body so rising steam reads sharply across DPIs
          const rib = (1 - s0 / (SPLIT_SEG / WISP_SEGS)) * 0.0025
          inkArr[inkIdx++] = pA.x - rib
          inkArr[inkIdx++] = pA.y
          inkArr[inkIdx++] = pA.z
          inkArr[inkIdx++] = pB.x - rib
          inkArr[inkIdx++] = pB.y
          inkArr[inkIdx++] = pB.z

          inkArr[inkIdx++] = pA.x + rib
          inkArr[inkIdx++] = pA.y
          inkArr[inkIdx++] = pA.z
          inkArr[inkIdx++] = pB.x + rib
          inkArr[inkIdx++] = pB.y
          inkArr[inkIdx++] = pB.z
        } else {
          mutedArr[mutedIdx++] = pA.x
          mutedArr[mutedIdx++] = pA.y
          mutedArr[mutedIdx++] = pA.z
          mutedArr[mutedIdx++] = pB.x
          mutedArr[mutedIdx++] = pB.y
          mutedArr[mutedIdx++] = pB.z
        }
      }
    }
    steamInkAttr.needsUpdate = true
    steamMutedAttr.needsUpdate = true
  }
  updateSteamWisps(0)

  const makeLineSegs = (verts, mat) => {
    const g = trackGeo(new BufferGeometry())
    g.setAttribute('position', new Float32BufferAttribute(verts, 3))
    const segs = new LineSegments(g, mat)
    segs.frustumCulled = false
    return segs
  }

  deskGroup.add(
    makeLineSegs(gridVerts, materials.gridLine),
    makeLineSegs(mutedVerts, materials.mutedLine),
    makeLineSegs(inkVerts, materials.inkLine),
    makeLineSegs(screenArcVerts, materials.screenArcLine)
  )

  // Ground backdrop plane matching page background
  const floorGeo = trackGeo(new PlaneGeometry(120, 120))
  floorGeo.rotateX(-Math.PI / 2)
  const floorMesh = new Mesh(floorGeo, materials.ground)
  floorMesh.position.y = -1.35
  scene.add(floorMesh)

  // Pre-allocated projection vectors for zero-allocation per-frame DOM overlay sync
  const vCenterTop = arcPoint(0, -0.008, INNER_TOP_Y - 0.03)
  const vCenterBot = arcPoint(0, -0.008, INNER_BOT_Y + 0.03)
  const vLeftTop = arcPoint(-INNER_HALF_ARC * 0.96, -0.008, INNER_TOP_Y - 0.03)
  const vLeftBot = arcPoint(-INNER_HALF_ARC * 0.96, -0.008, INNER_BOT_Y + 0.03)
  const vRightTop = arcPoint(INNER_HALF_ARC * 0.96, -0.008, INNER_TOP_Y - 0.03)
  const projScratch = new Vector3()

  function update(settleProgress, pointerX, pointerY, camera, viewportWidth, viewportHeight, time = 0) {
    updateSteamWisps(time)
    // settleProgress in [0, 1] maps scroll p in [0.49, 0.76] -> swoops down & locks on 49" monitor
    const aspect = Math.max(0.35, viewportWidth / Math.max(1, viewportHeight))
    const fov = 40
    if (camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    const fovRad = MathUtils.degToRad(fov)
    const vHalfTan = Math.tan(fovRad / 2)
    const hHalfTan = vHalfTan * aspect

    const outerHalfW = MONITOR_RADIUS * Math.sin(MONITOR_HALF_ARC) + 0.08
    const wingZ = ARC_ORIGIN_Z - MONITOR_RADIUS * Math.cos(MONITOR_HALF_ARC)

    // Responsive fill fraction so 49" curved monitor scales cleanly from 360px mobile to 2560px desktop
    const fillX = aspect < 0.75 ? 0.93 : aspect < 1.15 ? 0.86 : 0.74
    const zForWidth = wingZ + outerHalfW / (fillX * hHalfTan)
    const zForHeight = 4.9
    const settledCamZ = Math.max(zForWidth, zForHeight)
    const settledCamY = 0.98 + 0.115 * settledCamZ

    // Smooth quintic/cubic ease-out settle from elevated bird's-eye studio view into hero workstation framing
    const inv = 1 - settleProgress
    const ease = 1 - inv * inv * inv

    const startCamZ = settledCamZ + 3.2
    const startCamY = settledCamY + 2.35

    const parallaxScale = 0.35 + 0.65 * ease
    const camX = pointerX * 0.18 * parallaxScale
    const camY = MathUtils.lerp(startCamY, settledCamY, ease) + pointerY * 0.1 * parallaxScale
    const camZ = MathUtils.lerp(startCamZ, settledCamZ, ease)

    const lookY = MathUtils.lerp(0.58, 0.94, ease)
    camera.position.set(camX, camY, camZ)
    camera.lookAt(camX * 0.22, lookY, MONITOR_CENTER_Z)
    camera.updateMatrixWorld()

    // Fog opens smoothly from ink mist at handoff (settleProgress = 0) to completely clear of the desk
    const fogReveal = Math.min(1, settleProgress * 2.2)
    const fogEase = 1 - Math.pow(1 - fogReveal, 2)
    scene.fog.near = MathUtils.lerp(0, camZ + 6.5, fogEase)
    scene.fog.far = MathUtils.lerp(2.8, camZ + 26.0, fogEase)
  }

  function projectScreenBox(camera, viewportWidth, viewportHeight) {
    const toPx = (worldVec) => {
      projScratch.copy(worldVec).project(camera)
      return {
        x: (projScratch.x * 0.5 + 0.5) * viewportWidth,
        y: (-projScratch.y * 0.5 + 0.5) * viewportHeight,
      }
    }

    const cTop = toPx(vCenterTop)
    const cBot = toPx(vCenterBot)
    const lTop = toPx(vLeftTop)
    const lBot = toPx(vLeftBot)
    const rTop = toPx(vRightTop)

    const left = lTop.x
    const right = rTop.x
    const top = Math.max(cTop.y, lTop.y)
    const bottom = Math.min(cBot.y, lBot.y)

    return {
      left,
      top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    }
  }

  function dispose() {
    geometries.forEach((g) => g.dispose())
  }

  return {
    scene,
    lights: { ambient, key, fill },
    update,
    projectScreenBox,
    dispose,
  }
}
