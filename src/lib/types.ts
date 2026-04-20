import type { EasingName } from './easings'

const DEFAULT_PATH =
  'M 30 140 C 70 40 110 220 150 140 S 230 40 240 140'

export const DEFAULT_SVG = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path d="${DEFAULT_PATH}"/></svg>`

export interface TrailAnimState {
  // SVG source
  svgFileName: string        // for display
  viewBox: { x: number; y: number; w: number; h: number }
  paths: string[]            // extracted 'd' attributes from all <path> elements

  // Canvas
  canvasSize: number
  bgColor: string

  // Base guide path (the static outline shown under the trails)
  showBase: boolean
  baseColor: string
  baseStrokeWidth: number
  baseOpacity: number        // 0..1

  // Trails (the animated sweeping strokes)
  trailCount: number         // 1..6
  trailColors: string[]      // length 6
  trailLength: number        // 0.05..0.6 — fraction of path length
  trailStrokeWidth: number
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
    svgFileName: 'sample squiggle',
    viewBox: { x: 0, y: 0, w: 256, h: 256 },
    paths: [DEFAULT_PATH],
    canvasSize: 256,
    bgColor: '#FFFFFF',
    showBase: true,
    baseColor: '#1E1E1E',
    baseStrokeWidth: 8,
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
    trailStrokeWidth: 8,
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
      }
      paths.push(segs.join(' '))
    } catch {
      /* skip shapes we can't sample */
    }
  }

  document.body.removeChild(container)

  if (paths.length === 0) return null
  return { viewBox: vb, paths }
}
