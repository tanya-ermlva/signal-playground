import type { EasingName } from './easings'

const DEFAULT_PATH =
  'M 30 140 C 70 40 110 220 150 140 S 230 40 240 140'

export const DEFAULT_SVG = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path d="${DEFAULT_PATH}"/></svg>`

export interface LissajousParams {
  freqX: number        // 1..8 integer — x-axis oscillation count
  freqY: number        // 1..8 integer — y-axis oscillation count
  phase: number        // 0..π — static phase offset δ (starting value when animating)
  amplitude: number    // 0.3..0.95 — size as fraction of canvas
  animatePhase: boolean // when true, phase sweeps 0→2π over cycleDuration
  // Harmonograph extensions: make the curve feel less mathematically rigid.
  decay: number        // 0..1.5 — exponential amplitude decay over one cycle (0 = off, 1 = noticeable spiral)
  harmonic: number     // 0..0.4 — strength of a secondary oscillation mixed in, as a fraction of base amplitude
  harmonicMul: number  // 2..6 integer — frequency multiplier for the harmonic relative to the base freqs
  jitter: number       // 0..5 pixels — deterministic per-point displacement (hand-drawn feel)
  drift: number        // 0..1.5 — sinusoidal freq drift over the cycle (live-animation humanization)
}

export interface ScribbleParams {
  freqX: number          // 1..8 integer — base X frequency
  freqY: number          // 1..8 integer — base Y frequency
  phase: number          // 0..π — static phase of the base
  amplitude: number      // 0.3..0.95
  complexity: number     // 2..6 integer — number of extra randomised oscillators
  chaos: number          // 0..1 — how randomised the extra oscillators' freqs/phases are
  jitter: number         // 0..8 pixels — deterministic per-point noise
  seed: number           // integer — reroll button to get a different scribble
  animatePhase: boolean
}

// One configurable asterisk: N rays radiating from a single center. Each ray
// gets its own staggered trim-path sweep. Like the Burst mode but focused
// on a single shape with fine per-ray timing control.
export interface AsteriskParams {
  rays: number            // 3..24 — number of radiating lines
  evenAngles: boolean     // true = evenly spaced, false = random-jittered
  armLength: number       // 0.1..0.95 — base ray length as fraction of canvas half
  armVariance: number     // 0..1 — how much ray lengths vary
  innerGap: number        // 0..0.5 — inner gap (0 = rays touch centre)
  rayDuration: number     // 0.2..2s — life of each individual ray
  rayStagger: number      // 0..0.3s — delay between consecutive ray starts
  trailLength: number     // 0.1..1 — trim-path window on each ray
  rotation: number        // 0..2π — static rotation of the whole asterisk
  animateRotation: boolean // if true, rotates over the cycle
  centerDot: boolean
  centerDotRadius: number // px
  seed: number            // only matters when evenAngles is false
}

export interface BurstParams {
  count: number          // 1..16 — number of burst explosions per cycle
  rays: number           // 4..24 — lines per burst
  evenAngles: boolean    // true = evenly spaced (asterisk/sunburst); false = random (firework)
  armLength: number      // 0.1..0.9 — base ray length as fraction of canvas half
  armVariance: number    // 0..1 — how much ray lengths vary (0 = equal, 1 = wild)
  innerGap: number       // 0..0.5 — inner gap as fraction of ray length (0 = touches center)
  spread: number         // 0..1 — how far from canvas center bursts can be placed
  burstDuration: number  // 0.2..2 seconds — each burst's lifecycle
  trailLength: number    // 0.1..1 — trim-path window on each ray
  centerDot: boolean     // draw small filled dot at each burst's center
  centerDotRadius: number // px
  seed: number
}

// Parametric "object" shapes — all expressed as continuous closed curves in
// the same r = f(t), t ∈ [0, 2π] family as Lissajous.
export type ShapeKind =
  | 'circle'
  | 'infinity'
  | 'heart'
  | 'rose'
  | 'star'
  | 'butterfly'
  | 'spiral'

export interface ShapeParams {
  kind: ShapeKind
  amplitude: number       // 0.3..0.95
  petals: number          // 3..10 — used by rose and star
  rotation: number        // 0..2π — static rotation
  animateRotation: boolean
}

export interface TrailAnimState {
  // Path source: uploaded SVG, Lissajous, Scribble, Shape, single Asterisk, or Burst of many.
  source: 'upload' | 'lissajous' | 'scribble' | 'shape' | 'asterisk' | 'burst'
  lissajous: LissajousParams
  scribble: ScribbleParams
  shape: ShapeParams
  asterisk: AsteriskParams
  burst: BurstParams

  // SVG source (populated by upload OR by Lissajous generation — same fields).
  svgFileName: string        // for display
  viewBox: { x: number; y: number; w: number; h: number }
  paths: string[]            // polyline 'd' strings (flattened from any source)

  // Canvas
  canvasSize: number
  bgColor: string

  // Stroke width shared by base and all trails (keeps them visually consistent).
  strokeWidth: number
  // Line cap for both base and trails. 'round' fills stroked-shape tips but
  // creates visible dots mid-path; 'butt' is clean mid-path but leaves the
  // base's rounded tips uncovered at path endpoints.
  linecap: 'round' | 'butt' | 'square'
  // Gaussian blur applied to base + trails (pixels, stdDeviation).
  blur: number

  // Base guide path (the static outline shown under the trails)
  showBase: boolean
  baseColor: string
  baseOpacity: number        // 0..1

  // Trails (the animated sweeping strokes)
  trailCount: number         // 1..6
  trailColors: string[]      // length 6
  trailLength: number        // 0.05..0.6 — fraction of path length
  trailFade: number          // 0..0.4 — fraction of each trail's life used for fade in/out
  sceneFade: number          // 0..0.4 — fraction of cycleDuration used to fade the whole scene
  stagger: number            // 0..1 — seconds between trail starts
  duration: number           // seconds for a single trail to sweep 0→1
  easing: EasingName
  loop: boolean

  // Export
  transparentBg: boolean
  fps: number
}

export function createDefaultState(): TrailAnimState {
  return {
    source: 'upload',
    lissajous: {
      freqX: 3,
      freqY: 2,
      phase: Math.PI / 4,
      amplitude: 0.85,
      animatePhase: true,
      decay: 0,
      harmonic: 0,
      harmonicMul: 3,
      jitter: 0,
      drift: 0,
    },
    scribble: {
      freqX: 2,
      freqY: 3,
      phase: Math.PI / 4,
      amplitude: 0.8,
      complexity: 3,
      chaos: 0.6,
      jitter: 2,
      seed: 42,
      animatePhase: true,
    },
    shape: {
      kind: 'heart',
      amplitude: 0.7,
      petals: 5,
      rotation: 0,
      animateRotation: true,
    },
    asterisk: {
      rays: 8,
      evenAngles: true,
      armLength: 0.8,
      armVariance: 0.2,
      innerGap: 0,
      rayDuration: 0.9,
      rayStagger: 0.08,
      trailLength: 0.8,
      rotation: 0,
      animateRotation: false,
      centerDot: false,
      centerDotRadius: 4,
      seed: 13,
    },
    burst: {
      count: 6,
      rays: 10,
      evenAngles: false,
      armLength: 0.5,
      armVariance: 0.5,
      innerGap: 0.1,
      spread: 0.5,
      burstDuration: 0.9,
      trailLength: 0.8,
      centerDot: false,
      centerDotRadius: 3,
      seed: 7,
    },
    svgFileName: 'sample squiggle',
    viewBox: { x: 0, y: 0, w: 256, h: 256 },
    paths: [DEFAULT_PATH],
    canvasSize: 256,
    bgColor: '#FFFFFF',
    strokeWidth: 8,
    linecap: 'round',
    blur: 0,
    showBase: true,
    baseColor: '#1E1E1E',
    baseOpacity: 1,
    trailCount: 4,
    trailColors: [
      '#FF91E0', // pink
      '#4691E2', // blue
      '#ED9212', // orange
      '#5B6F00', // primary olive
      '#BD4A30', // red
      '#564391', // purple
    ],
    trailLength: 0.35,
    trailFade: 0.15,
    sceneFade: 0.1,
    stagger: 0.35,
    duration: 1.8,
    easing: 'easeInOutCubic',
    loop: true,
    transparentBg: true,
    fps: 30,
  }
}

// One full animation period. Source-specific when the mode has its own timing.
export function cycleDuration(state: TrailAnimState): number {
  if (state.source === 'asterisk') {
    const { rays, rayStagger, rayDuration } = state.asterisk
    return Math.max(rayDuration, (rays - 1) * rayStagger + rayDuration)
  }
  return (state.trailCount - 1) * state.stagger + state.duration
}

export interface ParsedSvg {
  viewBox: { x: number; y: number; w: number; h: number }
  paths: string[]
}

// Parse raw SVG text and flatten every drawable element (path, rect, circle,
// ellipse, line, polyline, polygon) into polyline `d` strings — applying each
// element's effective transform matrix so nested <g transform="…"> ancestors
// (the way Figma/Illustrator export) don't misplace the animation.
//
// Strategy: inject the SVG into a hidden DOM container so the browser builds
// the render tree, then for each geometry element use getTotalLength +
// getPointAtLength to walk the drawn shape, transforming each point through
// the element's CTM.
export function parseSvg(text: string): ParsedSvg | null {
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.visibility = 'hidden'
  container.style.left = '-99999px'
  container.style.top = '0'
  container.style.width = '0'
  container.style.height = '0'
  container.innerHTML = text
  document.body.appendChild(container)

  const svgEl = container.querySelector('svg')
  if (!svgEl) {
    document.body.removeChild(container)
    return null
  }

  // viewBox — try the attribute first, fall back to width/height, then 256×256.
  let vb = { x: 0, y: 0, w: 256, h: 256 }
  const vbAttr = svgEl.getAttribute('viewBox')
  if (vbAttr) {
    const parts = vbAttr.trim().split(/\s+|,/).map(Number)
    if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      vb = { x: parts[0], y: parts[1], w: parts[2], h: parts[3] }
    }
  } else {
    const w = parseFloat(svgEl.getAttribute('width') || '256')
    const h = parseFloat(svgEl.getAttribute('height') || '256')
    if (w > 0 && h > 0) vb = { x: 0, y: 0, w, h }
  }

  const SHAPES = 'path, rect, circle, ellipse, line, polyline, polygon'
  const geom = [...container.querySelectorAll(SHAPES)] as SVGGeometryElement[]
  const paths: string[] = []

  // Track the true content bbox from actual sampled points. We ignore the
  // authored viewBox when we have enough samples — uploaded SVGs often have
  // content flush to the edges, which would clip strokes. A tight bbox gives
  // us something to pad at render time.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const el of geom) {
    try {
      const len = el.getTotalLength?.() ?? 0
      if (!Number.isFinite(len) || len <= 0) continue
      // Sample density scaled to path length (min 50, max 400 points).
      const N = Math.max(50, Math.min(400, Math.floor(len / 2)))
      const ctm = el.getCTM() // effective transform from ancestors + own
      const segs: string[] = []
      for (let i = 0; i < N; i++) {
        const pt = el.getPointAtLength((i / (N - 1)) * len)
        const p = ctm ? pt.matrixTransform(ctm) : pt
        segs.push(`${i === 0 ? 'M' : 'L'} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
        if (p.x < minX) minX = p.x
        if (p.y < minY) minY = p.y
        if (p.x > maxX) maxX = p.x
        if (p.y > maxY) maxY = p.y
      }
      paths.push(segs.join(' '))
    } catch {
      /* skip shapes we can't sample */
    }
  }

  document.body.removeChild(container)

  if (paths.length === 0) return null

  // Prefer the tight content bbox over the authored viewBox when it's valid.
  if (Number.isFinite(minX) && maxX > minX && maxY > minY) {
    vb = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }
  return { viewBox: vb, paths }
}

// Deterministic pseudo-random in [0, 1) from an integer seed + index. Used for
// jitter and scribble harmonics so the curve is stable across frames.
function hashFloat(seed: number, i: number, salt = 0): number {
  const s = Math.sin((seed + i) * 12.9898 + salt * 78.233) * 43758.5453
  return s - Math.floor(s)
}

// Track the bbox of sampled points so the viewBox always snugly fits the drawn curve.
function ingest(pt: { x: number; y: number }, bbox: number[]) {
  if (pt.x < bbox[0]) bbox[0] = pt.x
  if (pt.y < bbox[1]) bbox[1] = pt.y
  if (pt.x > bbox[2]) bbox[2] = pt.x
  if (pt.y > bbox[3]) bbox[3] = pt.y
}

// Generate a Lissajous curve as a polyline 'd' string plus its tight viewBox.
// Harmonograph extensions: decay makes the amplitude spiral down over the
// cycle, harmonic+harmonicMul mix in a secondary oscillation, jitter adds a
// deterministic per-point displacement.
export function generateLissajousPath(
  params: LissajousParams,
  size = 256,
  samples = 400,
): { path: string; viewBox: { x: number; y: number; w: number; h: number } } {
  const TAU = Math.PI * 2
  const cx = size / 2
  const cy = size / 2
  const r = params.amplitude * (size / 2)
  const segs: string[] = []
  const bbox = [Infinity, Infinity, -Infinity, -Infinity]
  const harm = params.harmonic ?? 0
  const hmul = params.harmonicMul ?? 3
  const decay = params.decay ?? 0
  const jitter = params.jitter ?? 0
  const norm = 1 / (1 + harm) // keep total amplitude normalised so curve fits

  for (let i = 0; i < samples; i++) {
    const u = (i / (samples - 1)) * TAU
    const decayFactor = decay > 0 ? Math.exp(-decay * u / TAU) : 1

    const xBase = Math.sin(params.freqX * u + params.phase)
    const yBase = Math.sin(params.freqY * u)
    const xHarm = harm * Math.sin(params.freqX * hmul * u + params.phase * 1.3)
    const yHarm = harm * Math.sin(params.freqY * hmul * u)

    let x = cx + r * decayFactor * norm * (xBase + xHarm)
    let y = cy + r * decayFactor * norm * (yBase + yHarm)

    if (jitter > 0) {
      x += (hashFloat(0, i, 1) - 0.5) * 2 * jitter
      y += (hashFloat(0, i, 2) - 0.5) * 2 * jitter
    }

    segs.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(3)} ${y.toFixed(3)}`)
    ingest({ x, y }, bbox)
  }
  return {
    path: segs.join(' '),
    viewBox: { x: bbox[0], y: bbox[1], w: bbox[2] - bbox[0], h: bbox[3] - bbox[1] },
  }
}

// Scribble: base Lissajous + N randomised-frequency harmonics summed in. The
// randomness is driven by `seed` so each value of seed produces a different
// stable scribble; same seed always looks the same. Deterministic across frames.
export function generateScribblePath(
  params: ScribbleParams,
  size = 256,
  samples = 500,
): { path: string; viewBox: { x: number; y: number; w: number; h: number } } {
  const TAU = Math.PI * 2
  const cx = size / 2
  const cy = size / 2
  const r = params.amplitude * (size / 2)

  // Pre-compute the extra oscillators. Each has its own freq multipliers and
  // phase offsets drawn deterministically from the seed.
  const harms: Array<{ fx: number; fy: number; px: number; py: number; amp: number }> = []
  for (let n = 1; n <= params.complexity; n++) {
    const chaos = params.chaos
    const fx = 1 + n + (hashFloat(params.seed, n, 11) - 0.5) * chaos * 6
    const fy = 1 + n + (hashFloat(params.seed, n, 22) - 0.5) * chaos * 6
    const px = hashFloat(params.seed, n, 33) * TAU
    const py = hashFloat(params.seed, n, 44) * TAU
    const amp = 1 / (n + 1)
    harms.push({ fx, fy, px, py, amp })
  }
  const totalAmp = 1 + harms.reduce((s, h) => s + h.amp, 0)
  const norm = 1 / totalAmp

  const segs: string[] = []
  const bbox = [Infinity, Infinity, -Infinity, -Infinity]

  for (let i = 0; i < samples; i++) {
    const u = (i / (samples - 1)) * TAU

    let sx = Math.sin(params.freqX * u + params.phase)
    let sy = Math.sin(params.freqY * u)
    for (const h of harms) {
      sx += h.amp * Math.sin(params.freqX * h.fx * u + h.px + params.phase)
      sy += h.amp * Math.sin(params.freqY * h.fy * u + h.py)
    }

    let x = cx + r * norm * sx
    let y = cy + r * norm * sy

    if (params.jitter > 0) {
      x += (hashFloat(params.seed, i, 55) - 0.5) * 2 * params.jitter
      y += (hashFloat(params.seed, i, 66) - 0.5) * 2 * params.jitter
    }

    segs.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(3)} ${y.toFixed(3)}`)
    ingest({ x, y }, bbox)
  }
  return {
    path: segs.join(' '),
    viewBox: { x: bbox[0], y: bbox[1], w: bbox[2] - bbox[0], h: bbox[3] - bbox[1] },
  }
}

// Effective viewBox for rendering — pads for stroke half-width plus any blur
// spread (Gaussian blur reaches ~3σ past its nominal edge). For source modes
// that draw in canvas coordinates (asterisk, burst), we compute a bbox that
// encompasses the actual drawn extent so rays aren't clipped.
export function effectiveViewBox(state: TrailAnimState) {
  const pad = state.strokeWidth / 2 + state.blur * 3
  const center = state.canvasSize / 2

  if (state.source === 'asterisk') {
    const rays = generateAsteriskRays(state.asterisk, state.canvasSize)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const r of rays) {
      const x = center + Math.cos(r.angle) * r.length
      const y = center + Math.sin(r.angle) * r.length
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    // Always include the center so the asterisk stays visually anchored.
    if (center < minX) minX = center
    if (center < minY) minY = center
    if (center > maxX) maxX = center
    if (center > maxY) maxY = center
    return {
      x: minX - pad,
      y: minY - pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
    }
  }

  if (state.source === 'burst') {
    // Expand around canvas center by the max possible ray reach (spread + maxArm).
    const canvasHalf = state.canvasSize / 2
    const maxArm = state.burst.armLength * (1 + state.burst.armVariance * 0.6) * canvasHalf
    const maxSpread = state.burst.spread * canvasHalf
    const extent = maxSpread + maxArm + pad
    return {
      x: center - extent,
      y: center - extent,
      w: extent * 2,
      h: extent * 2,
    }
  }

  return {
    x: state.viewBox.x - pad,
    y: state.viewBox.y - pad,
    w: state.viewBox.w + pad * 2,
    h: state.viewBox.h + pad * 2,
  }
}

// Parametric object shapes. Each function maps t ∈ [0, 2π] → a unit-sized
// (x, y) in roughly [-1, 1]². Callers scale + translate to the final canvas.
function shapeAt(kind: ShapeKind, t: number, petals: number): [number, number] {
  switch (kind) {
    case 'circle':
      return [Math.cos(t), Math.sin(t)]

    case 'infinity': {
      // Lemniscate of Bernoulli, normalised to fit in [-1, 1].
      const denom = 1 + Math.sin(t) * Math.sin(t)
      return [Math.cos(t) / denom, (Math.sin(t) * Math.cos(t)) / denom]
    }

    case 'heart': {
      // Classic heart curve, normalised. y is negated so the heart points up.
      const s = Math.sin(t)
      const xRaw = 16 * s * s * s
      const yRaw = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      return [xRaw / 17, -yRaw / 17]
    }

    case 'rose': {
      // r = cos(k·t). For integer k: k petals if k odd, 2k petals if k even.
      const rr = Math.cos(petals * t)
      return [rr * Math.cos(t), rr * Math.sin(t)]
    }

    case 'star': {
      // Soft star — amplitude pulses at petals×t producing rounded points.
      const rr = 0.6 + 0.4 * Math.cos(petals * t)
      return [rr * Math.cos(t), rr * Math.sin(t)]
    }

    case 'butterfly': {
      // Temple H. Fay's butterfly curve, normalised.
      const m =
        Math.exp(Math.cos(t)) -
        2 * Math.cos(4 * t) -
        Math.pow(Math.sin(t / 12), 5)
      return [(Math.sin(t) * m) / 5, -(Math.cos(t) * m) / 5]
    }

    case 'spiral': {
      // Looping double-spiral that closes at 2π (out then back).
      const u = t / (Math.PI * 2) // 0..1
      const radial = u < 0.5 ? u * 2 : (1 - u) * 2
      return [radial * Math.cos(petals * t), radial * Math.sin(petals * t)]
    }
  }
}

export function generateShapePath(
  params: ShapeParams,
  size = 256,
  samples = 500,
): { path: string; viewBox: { x: number; y: number; w: number; h: number } } {
  const TAU = Math.PI * 2
  const cx = size / 2
  const cy = size / 2
  const r = params.amplitude * (size / 2)
  const cosR = Math.cos(params.rotation)
  const sinR = Math.sin(params.rotation)

  const segs: string[] = []
  const bbox = [Infinity, Infinity, -Infinity, -Infinity]

  for (let i = 0; i < samples; i++) {
    const t = (i / (samples - 1)) * TAU
    const [ux, uy] = shapeAt(params.kind, t, params.petals)
    const rx = ux * cosR - uy * sinR
    const ry = ux * sinR + uy * cosR
    const x = cx + r * rx
    const y = cy + r * ry
    segs.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(3)} ${y.toFixed(3)}`)
    ingest({ x, y }, bbox)
  }

  return {
    path: segs.join(' '),
    viewBox: { x: bbox[0], y: bbox[1], w: bbox[2] - bbox[0], h: bbox[3] - bbox[1] },
  }
}

// A single burst placement — a center point and N rays specified by angle + length.
// Generated deterministically from BurstParams + seed so it's stable across frames.
export interface BurstInstance {
  cx: number
  cy: number
  startOffset: number  // seconds from cycle start
  rays: Array<{ angle: number; length: number }>
}

// Generate the ray list for a single configurable Asterisk.
export function generateAsteriskRays(
  params: AsteriskParams,
  canvasSize: number,
): Array<{ angle: number; length: number }> {
  const TAU = Math.PI * 2
  const canvasHalf = canvasSize / 2
  const rays: Array<{ angle: number; length: number }> = []
  for (let j = 0; j < params.rays; j++) {
    const baseAng = params.evenAngles
      ? (j / params.rays) * TAU
      : hashFloat(params.seed, j, 401) * TAU
    const angJit = params.evenAngles
      ? (hashFloat(params.seed, j, 402) - 0.5) * 0.08
      : 0
    const angle = baseAng + angJit + params.rotation
    const lenVariance = 1 - params.armVariance + params.armVariance * hashFloat(params.seed, j, 403) * 1.6
    const length = params.armLength * canvasHalf * lenVariance
    rays.push({ angle, length })
  }
  return rays
}

export function generateBursts(params: BurstParams, canvasSize: number, cycleSec: number): BurstInstance[] {
  const TAU = Math.PI * 2
  const center = canvasSize / 2
  const canvasHalf = canvasSize / 2
  const out: BurstInstance[] = []
  for (let i = 0; i < params.count; i++) {
    // Burst position: within a disc of radius spread*canvasHalf around centre.
    const posAng = hashFloat(params.seed, i, 101) * TAU
    const posR = Math.sqrt(hashFloat(params.seed, i, 102)) * params.spread * canvasHalf
    const cx = center + posR * Math.cos(posAng)
    const cy = center + posR * Math.sin(posAng)

    const rays: Array<{ angle: number; length: number }> = []
    for (let j = 0; j < params.rays; j++) {
      const baseAng = params.evenAngles
        ? (j / params.rays) * TAU
        : hashFloat(params.seed, i * 1000 + j, 103) * TAU
      // Add a small angle jitter even when evenAngles is true, for organic feel.
      const angJit = params.evenAngles
        ? (hashFloat(params.seed, i * 1000 + j, 104) - 0.5) * 0.08
        : 0
      const angle = baseAng + angJit
      const lenVariance = 1 - params.armVariance + params.armVariance * hashFloat(params.seed, i * 1000 + j, 105) * 1.6
      const length = params.armLength * canvasHalf * lenVariance
      rays.push({ angle, length })
    }

    // Spread start times evenly across the cycle so bursts feel like an
    // ongoing firework show rather than all going off at once.
    const startOffset = (i / params.count) * cycleSec
    out.push({ cx, cy, startOffset, rays })
  }
  return out
}

// Compute the effective path(s) + viewBox for the current frame.
// - Uploaded SVG: unchanged.
// - Lissajous + animatePhase: phase sweeps 0→2π over cycle; optional freq drift
//   adds a small sinusoidal offset to freqX/freqY out-of-phase (returns to
//   starting values at cycle boundary so loop is seamless).
// - Scribble + animatePhase: phase sweeps 0→2π similarly.
export function computeLiveState(state: TrailAnimState, absTimeSec: number): TrailAnimState {
  if (state.source === 'lissajous' && state.lissajous.animatePhase) {
    const cycle = cycleDuration(state)
    const t01 = cycle > 0 ? (absTimeSec / cycle) % 1 : 0
    const TAU = Math.PI * 2
    const dynamicPhase = state.lissajous.phase + t01 * TAU
    const drift = state.lissajous.drift ?? 0
    const dynFreqX = state.lissajous.freqX + drift * Math.sin(TAU * t01)
    const dynFreqY = state.lissajous.freqY + drift * Math.cos(TAU * t01)
    const { path, viewBox } = generateLissajousPath({
      ...state.lissajous,
      phase: dynamicPhase,
      freqX: dynFreqX,
      freqY: dynFreqY,
    })
    return { ...state, paths: [path], viewBox }
  }
  if (state.source === 'scribble' && state.scribble.animatePhase) {
    const cycle = cycleDuration(state)
    const t01 = cycle > 0 ? (absTimeSec / cycle) % 1 : 0
    const dynamicPhase = state.scribble.phase + t01 * Math.PI * 2
    const { path, viewBox } = generateScribblePath({ ...state.scribble, phase: dynamicPhase })
    return { ...state, paths: [path], viewBox }
  }
  if (state.source === 'asterisk' && state.asterisk.animateRotation) {
    const cycle = cycleDuration(state)
    const t01 = cycle > 0 ? (absTimeSec / cycle) % 1 : 0
    const dynamicRotation = state.asterisk.rotation + t01 * Math.PI * 2
    return { ...state, asterisk: { ...state.asterisk, rotation: dynamicRotation } }
  }
  if (state.source === 'shape' && state.shape.animateRotation) {
    const cycle = cycleDuration(state)
    const t01 = cycle > 0 ? (absTimeSec / cycle) % 1 : 0
    const dynamicRotation = state.shape.rotation + t01 * Math.PI * 2
    const { path, viewBox } = generateShapePath({ ...state.shape, rotation: dynamicRotation })
    return { ...state, paths: [path], viewBox }
  }
  return state
}
