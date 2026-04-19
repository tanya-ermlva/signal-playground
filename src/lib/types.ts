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

// Parse raw SVG text. Returns the viewBox and flattened array of path 'd' attributes
// from ALL <path> elements. Ignores other shapes (rect, circle, etc.) for now —
// trim-path only makes sense on stroked paths.
export function parseSvg(text: string): ParsedSvg | null {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const svgEl = doc.querySelector('svg')
  if (!svgEl) return null

  // Viewbox fallback to width/height if missing
  let vb = { x: 0, y: 0, w: 256, h: 256 }
  const vbAttr = svgEl.getAttribute('viewBox')
  if (vbAttr) {
    const [x, y, w, h] = vbAttr.split(/\s+|,/).map(Number)
    if ([x, y, w, h].every(Number.isFinite) && w > 0 && h > 0) vb = { x, y, w, h }
  } else {
    const w = parseFloat(svgEl.getAttribute('width') || '256')
    const h = parseFloat(svgEl.getAttribute('height') || '256')
    if (w > 0 && h > 0) vb = { x: 0, y: 0, w, h }
  }

  const paths = [...doc.querySelectorAll('path')]
    .map((p) => p.getAttribute('d') || '')
    .filter(Boolean)

  if (paths.length === 0) return null
  return { viewBox: vb, paths }
}
