import type { TrailAnimState } from './types'
import { EASINGS, sampleEasing } from './easings'
import { cycleDuration } from './types'

const SVG_NS = 'http://www.w3.org/2000/svg'

function hexToRgbA(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
    1,
  ]
}

// Compute head (0..1) and tail (0..1) positions along the path for trail i
// at absolute time t (seconds) within one cycle.
function trailPositions(
  state: TrailAnimState,
  i: number,
  absTimeSec: number,
): { head: number; tail: number; active: boolean } {
  const easeFn = EASINGS[state.easing]
  const start = i * state.stagger
  const localT = absTimeSec - start
  if (localT < 0 || localT > state.duration) {
    return { head: 0, tail: 0, active: false }
  }
  const p = localT / state.duration
  const eased = easeFn(p)
  const head = Math.min(1, eased)
  const tail = Math.max(0, eased - state.trailLength)
  return { head, tail, active: true }
}

function applyBaseAttrs(p: SVGPathElement, color: string, strokeWidth: number, opacity: number) {
  p.setAttribute('fill', 'none')
  p.setAttribute('stroke', color)
  p.setAttribute('stroke-width', String(strokeWidth))
  p.setAttribute('stroke-linecap', 'round')
  p.setAttribute('stroke-linejoin', 'round')
  p.setAttribute('opacity', String(opacity))
}

export function renderTrailAnim(svg: SVGSVGElement, state: TrailAnimState, absTimeSec: number) {
  while (svg.firstChild) svg.removeChild(svg.firstChild)

  // Base guide paths (static) — rendered first so trails draw on top.
  if (state.showBase) {
    for (const d of state.paths) {
      const p = document.createElementNS(SVG_NS, 'path')
      p.setAttribute('d', d)
      applyBaseAttrs(p, state.baseColor, state.baseStrokeWidth, state.baseOpacity)
      svg.appendChild(p)
    }
  }

  // Trail paths: each trail sweeps a segment along the path via stroke-dasharray.
  // Using pathLength="1" normalises the path's total length to 1 so the dash
  // arithmetic is just fractions — independent of the actual path geometry.
  for (let i = 0; i < state.trailCount; i++) {
    const { head, tail, active } = trailPositions(state, i, absTimeSec)
    if (!active) continue
    const visibleLen = head - tail
    if (visibleLen <= 0.001) continue
    const color = state.trailColors[i % state.trailColors.length]

    for (const d of state.paths) {
      const trail = document.createElementNS(SVG_NS, 'path')
      trail.setAttribute('d', d)
      trail.setAttribute('pathLength', '1')
      applyBaseAttrs(trail, color, state.trailStrokeWidth, 1)
      // dasharray parts: [invisible before tail] [visible segment] [invisible after head]
      // tail then gap then (head-tail) then gap to end
      // Format: 0 tail (head-tail) (1 - head)
      trail.setAttribute(
        'stroke-dasharray',
        `0 ${tail.toFixed(4)} ${visibleLen.toFixed(4)} ${(1 - head).toFixed(4)}`,
      )
      svg.appendChild(trail)
    }
  }
}

// =============== Lottie export ===============

// Parse an SVG path 'd' into a polyline of N vertices using getPointAtLength.
// This produces a Lottie-compatible vertex array at the cost of discretising
// curves — 200 samples is visually indistinguishable for most real paths.
export function sampleSvgPath(
  d: string,
  samples = 200,
): Array<[number, number]> {
  const tempSvg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
  tempSvg.style.position = 'absolute'
  tempSvg.style.left = '-99999px'
  tempSvg.style.visibility = 'hidden'
  document.body.appendChild(tempSvg)
  const p = document.createElementNS(SVG_NS, 'path') as SVGPathElement
  p.setAttribute('d', d)
  tempSvg.appendChild(p)
  const len = p.getTotalLength()
  const out: Array<[number, number]> = []
  if (len === 0 || samples < 2) {
    const pt = p.getPointAtLength(0)
    out.push([pt.x, pt.y])
  } else {
    for (let i = 0; i < samples; i++) {
      const pt = p.getPointAtLength((i / (samples - 1)) * len)
      out.push([pt.x, pt.y])
    }
  }
  document.body.removeChild(tempSvg)
  return out
}

function staticVal<T>(k: T) {
  return { a: 0, k }
}

interface Keyframe<T> {
  t: number
  s: T
  h?: 1
}

function animatedProp<T>(keyframes: Keyframe<T>[]) {
  return { a: 1, k: keyframes }
}

// Build one shape layer that draws a single trail (one copy of the path with
// an animated trim-path sweeping across it).
function makeTrailLayer(args: {
  vertices: Array<[number, number]>
  color: string
  strokeWidth: number
  totalFrames: number
  startFrame: number
  endFrame: number
  trailLength: number
  easingName: keyof typeof EASINGS
  layerIndex: number
  offsetX: number
  offsetY: number
}) {
  const {
    vertices,
    color,
    strokeWidth,
    totalFrames,
    startFrame,
    endFrame,
    trailLength,
    easingName,
    layerIndex,
    offsetX,
    offsetY,
  } = args

  // Centered-at-origin vertices so the shape layer's position=[originX, originY] aligns correctly.
  const verts = vertices.map(([x, y]) => [x - offsetX, y - offsetY])
  const pathShape = {
    ty: 'sh',
    ks: {
      a: 0,
      k: {
        i: verts.map(() => [0, 0]),
        o: verts.map(() => [0, 0]),
        v: verts,
        c: false,
      },
    },
  }

  // Sample easing to bake trim-path keyframes. We use 30 samples for smoothness
  // across all 25 easings (including back-family overshoots Lottie's native
  // bezier tangents can't express directly).
  const SAMPLES = 30
  const eased = sampleEasing(easingName, SAMPLES)

  const sKeyframes: Keyframe<[number]>[] = []
  const eKeyframes: Keyframe<[number]>[] = []
  // Hold at 0 before the trail begins (invisible).
  sKeyframes.push({ t: 0, s: [0], h: 1 })
  eKeyframes.push({ t: 0, s: [0], h: 1 })

  for (let k = 0; k <= SAMPLES; k++) {
    const tNorm = k / SAMPLES          // [0, 1]
    const progress = eased[k]          // eased progress along the path (0..1)
    const head = Math.min(1, progress) * 100
    const tail = Math.max(0, progress - trailLength) * 100
    const frame = startFrame + tNorm * (endFrame - startFrame)
    sKeyframes.push({ t: frame, s: [tail] })
    eKeyframes.push({ t: frame, s: [head] })
  }

  // Hold at final values past endFrame (invisible).
  sKeyframes.push({ t: endFrame, s: [100], h: 1 })
  eKeyframes.push({ t: endFrame, s: [100], h: 1 })

  return {
    ty: 4,
    nm: `trail-${layerIndex}`,
    ind: layerIndex,
    ks: {
      o: staticVal(100),
      p: staticVal([offsetX, offsetY, 0]),
      a: staticVal([0, 0, 0]),
      s: staticVal([100, 100, 100]),
      r: staticVal(0),
    },
    ao: 0,
    ip: 0,
    op: totalFrames,
    st: 0,
    shapes: [
      {
        ty: 'gr',
        it: [
          pathShape,
          {
            ty: 'tm',
            s: animatedProp(sKeyframes),
            e: animatedProp(eKeyframes),
            o: staticVal(0),
            m: 1,
          },
          {
            ty: 'st',
            c: staticVal(hexToRgbA(color)),
            o: staticVal(100),
            w: staticVal(strokeWidth),
            lc: 2, // round cap
            lj: 2, // round join
            ml: 4,
          },
          {
            ty: 'tr',
            p: staticVal([0, 0]),
            a: staticVal([0, 0]),
            s: staticVal([100, 100]),
            r: staticVal(0),
            o: staticVal(100),
            sk: staticVal(0),
            sa: staticVal(0),
          },
        ],
      },
    ],
  }
}

function makeBaseLayer(args: {
  vertices: Array<[number, number]>
  color: string
  strokeWidth: number
  opacity: number
  totalFrames: number
  layerIndex: number
  offsetX: number
  offsetY: number
}) {
  const { vertices, color, strokeWidth, opacity, totalFrames, layerIndex, offsetX, offsetY } = args
  const verts = vertices.map(([x, y]) => [x - offsetX, y - offsetY])
  const pathShape = {
    ty: 'sh',
    ks: {
      a: 0,
      k: {
        i: verts.map(() => [0, 0]),
        o: verts.map(() => [0, 0]),
        v: verts,
        c: false,
      },
    },
  }
  return {
    ty: 4,
    nm: `base-${layerIndex}`,
    ind: layerIndex,
    ks: {
      o: staticVal(opacity * 100),
      p: staticVal([offsetX, offsetY, 0]),
      a: staticVal([0, 0, 0]),
      s: staticVal([100, 100, 100]),
      r: staticVal(0),
    },
    ao: 0,
    ip: 0,
    op: totalFrames,
    st: 0,
    shapes: [
      {
        ty: 'gr',
        it: [
          pathShape,
          {
            ty: 'st',
            c: staticVal(hexToRgbA(color)),
            o: staticVal(100),
            w: staticVal(strokeWidth),
            lc: 2,
            lj: 2,
            ml: 4,
          },
          {
            ty: 'tr',
            p: staticVal([0, 0]),
            a: staticVal([0, 0]),
            s: staticVal([100, 100]),
            r: staticVal(0),
            o: staticVal(100),
            sk: staticVal(0),
            sa: staticVal(0),
          },
        ],
      },
    ],
  }
}

export function buildTrailLottie(state: TrailAnimState) {
  const {
    canvasSize,
    paths,
    viewBox,
    showBase,
    baseColor,
    baseStrokeWidth,
    baseOpacity,
    trailCount,
    trailColors,
    trailLength,
    trailStrokeWidth,
    stagger,
    duration,
    easing,
    fps,
  } = state
  const cycleSec = cycleDuration(state)
  const totalFrames = Math.max(1, Math.round(cycleSec * fps))

  // The comp is canvasSize x canvasSize. We scale the source viewBox to fit
  // inside the canvas while preserving aspect ratio.
  const scale = Math.min(canvasSize / viewBox.w, canvasSize / viewBox.h)
  const offsetX = (canvasSize - viewBox.w * scale) / 2 - viewBox.x * scale
  const offsetY = (canvasSize - viewBox.h * scale) / 2 - viewBox.y * scale

  // Sample each path once; reuse the vertices across base + trail layers.
  const pathVerts = paths.map((d) => {
    const raw = sampleSvgPath(d, 200)
    return raw.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY]) as Array<[number, number]>
  })

  const layers: any[] = []
  let layerIndex = 1

  if (showBase) {
    for (const verts of pathVerts) {
      layers.push(
        makeBaseLayer({
          vertices: verts,
          color: baseColor,
          strokeWidth: baseStrokeWidth,
          opacity: baseOpacity,
          totalFrames,
          layerIndex: layerIndex++,
          offsetX: canvasSize / 2,
          offsetY: canvasSize / 2,
        }),
      )
    }
  }

  // Trails go on top of base: later layers render on top in Lottie's shape stack
  // (or rather, first layer in the `layers` array is drawn on top in After
  // Effects convention — but lottie-web renders first-added as bottom). We want
  // trails above base, so we add them after base in the array.
  for (let i = 0; i < trailCount; i++) {
    const startFrame = Math.round(i * stagger * fps)
    const endFrame = Math.min(totalFrames, startFrame + Math.round(duration * fps))
    const color = trailColors[i % trailColors.length]

    for (const verts of pathVerts) {
      layers.push(
        makeTrailLayer({
          vertices: verts,
          color,
          strokeWidth: trailStrokeWidth,
          totalFrames,
          startFrame,
          endFrame,
          trailLength,
          easingName: easing,
          layerIndex: layerIndex++,
          offsetX: canvasSize / 2,
          offsetY: canvasSize / 2,
        }),
      )
    }
  }

  return {
    v: '5.9.0',
    fr: fps,
    ip: 0,
    op: totalFrames,
    w: canvasSize,
    h: canvasSize,
    nm: 'signal-trail-anim',
    ddd: 0,
    assets: [],
    layers,
    meta: { g: 'signal-playground' },
  }
}
