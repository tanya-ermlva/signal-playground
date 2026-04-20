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

export interface TrailAnimState {
  // Path source: uploaded SVG, generated Lissajous curve, or generated Scribble.
  source: 'upload' | 'lissajous' | 'scribble'
  lissajous: LissajousParams
  scribble: ScribbleParams

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

// One full animation period. Last trail starts at (trailCount-1)*stagger
// and sweeps for duration seconds. After it finishes, the loop restarts.
export function cycleDuration(state: TrailAnimState): number {
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
// spread (Gaussian blur reaches ~3σ past its nominal edge).
export function effectiveViewBox(state: TrailAnimState) {
  const pad = state.strokeWidth / 2 + state.blur * 3
  return {
    x: state.viewBox.x - pad,
    y: state.viewBox.y - pad,
    w: state.viewBox.w + pad * 2,
    h: state.viewBox.h + pad * 2,
  }
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
  return state
}
