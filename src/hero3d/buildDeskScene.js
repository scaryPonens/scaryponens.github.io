import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
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

  // 4. 75% Mechanical Keyboard Silhouette + Instanced Keycaps + Coiled Cable
  const kbX = -0.22
  const kbZ = 0.78
  const kbTilt = 0.075
  addStaticBox(materials.massHigh, kbX, 0.048, kbZ, 1.38, 0.068, 0.48, kbTilt, 0, 0, 'ink')
  // Recessed keywell plate
  addStaticBox(materials.massDeep, kbX, 0.078, kbZ, 1.29, 0.02, 0.4, kbTilt, 0, 0, 'muted')

  // Instanced keycaps (5 sculpted rows)
  const keyMatrices = []
  const keyRows = 5
  const keyCols = 14
  const kbQuat = new Quaternion().setFromEuler(new Euler(kbTilt, 0, 0))
  for (let r = 0; r < keyRows; r++) {
    const localZ = -0.155 + r * 0.078
    if (r === 4) {
      // Bottom row with spacebar & modifiers
      const bottomLayout = [
        [-0.56, 0.095],
        [-0.45, 0.095],
        [-0.34, 0.095],
        [-0.02, 0.48], // spacebar
        [0.3, 0.095],
        [0.41, 0.095],
        [0.52, 0.08],
        [0.6, 0.08],
      ]
      for (const [kx, kw] of bottomLayout) {
        tmpPos.set(kx, 0.046, localZ).applyQuaternion(kbQuat)
        tmpPos.x += kbX
        tmpPos.y += 0.05
        tmpPos.z += kbZ
        tmpScale.set(kw, 0.032, 0.062)
        keyMatrices.push(new Matrix4().compose(tmpPos, kbQuat, tmpScale))
      }
    } else {
      for (let c = 0; c < keyCols; c++) {
        const isWideLeft = c === 0 && r > 0
        const isWideRight = c === keyCols - 1 && (r === 1 || r === 2 || r === 3)
        const kw = isWideLeft || isWideRight ? 0.1 : 0.074
        const kx = -0.575 + c * 0.0885
        tmpPos.set(kx, 0.046, localZ).applyQuaternion(kbQuat)
        tmpPos.x += kbX
        tmpPos.y += 0.05
        tmpPos.z += kbZ
        tmpScale.set(kw, 0.032, 0.062)
        keyMatrices.push(new Matrix4().compose(tmpPos, kbQuat, tmpScale))
      }
    }
  }
  const keycapMesh = new InstancedMesh(boxGeo, materials.massMid, keyMatrices.length)
  for (let i = 0; i < keyMatrices.length; i++) {
    keycapMesh.setMatrixAt(i, keyMatrices[i])
    pushTransformedEdges(boxEdges.attributes.position, mutedVerts, keyMatrices[i])
  }
  keycapMesh.instanceMatrix.needsUpdate = true
  deskGroup.add(keycapMesh)

  // Clean USB-C cable from keyboard rear to stand riser
  pushSeg(inkVerts, kbX, 0.045, kbZ - 0.24, kbX, 0.024, 0.18)
  pushSeg(inkVerts, kbX, 0.024, 0.18, 0, 0.024, -0.04)
  pushSeg(inkVerts, 0, 0.024, -0.04, 0, 0.22, -0.31)

  // 5. Ergonomic Wireless Mouse Silhouette on right side of desk mat
  const msX = 0.88
  const msZ = 0.8
  addStaticBox(materials.massHigh, msX, 0.046, msZ, 0.23, 0.064, 0.37, 0.04, -0.05, 0, 'ink')
  addStaticBox(materials.massMid, msX, 0.082, msZ - 0.01, 0.19, 0.024, 0.26, 0.06, -0.05, 0, 'ink')
  // Scroll wheel
  addStaticBox(materials.massDeep, msX + 0.005, 0.096, msZ - 0.09, 0.028, 0.022, 0.068, 0, -0.05, 0, 'ink')

  // 6. Closed Field Notebook & Technical Pen on left desk wing (nod to Field Notes)
  const nbX = -2.42
  const nbZ = 0.68
  const nbRot = 0.14
  addStaticBox(materials.massMid, nbX, 0.036, nbZ, 0.66, 0.052, 0.92, 0, nbRot, 0, 'ink')
  addStaticBox(materials.massHigh, nbX - 0.28, 0.038, nbZ + 0.04, 0.09, 0.056, 0.922, 0, nbRot, 0, 'ink')
  // Drafting pen beside notebook
  addStaticBox(materials.massHigh, nbX + 0.46, 0.026, nbZ + 0.02, 0.032, 0.032, 0.72, 0, nbRot - 0.06, 0, 'ink')

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

  function update(settleProgress, pointerX, pointerY, camera, viewportWidth, viewportHeight) {
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
