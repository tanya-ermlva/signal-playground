import type { TrailAnimState } from './types'
import { EASINGS, sampleEasing } from './easings'
import { cycleDuration, effectiveViewBox } from './types'

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
): { head: number; tail: number; opacity: number; active: boolean } {
  const easeFn = EASINGS[state.easing]
  const start = i * state.stagger
  const localT = absTimeSec - start
  if (localT < 0 || localT > state.duration) {
    return { head: 0, tail: 0, opacity: 0, active: false }
  }
  // The trail's "tip" travels from 0 to (1 + trailLength) across the duration.
  // Head saturates at 1 once the tip reaches the end; tail keeps climbing
  // until it too hits 1, at which point the trail has fully exited.
  const phase = localT / state.duration
  const tip = easeFn(phase) * (1 + state.trailLength)
  const head = Math.min(1, tip)
  const tail = Math.max(0, Math.min(1, tip - state.trailLength))

  // Fade-in at the start, fade-out at the end, symmetric. `trailFade` is the
  // fraction of the trail's life used for each ramp.
  const fade = Math.max(0, Math.min(0.49, state.trailFade))
  let opacity = 1
  if (fade > 0) {
    if (phase < fade) opacity = phase / fade
    else if (phase > 1 - fade) opacity = (1 - phase) / fade
  }
  return { head, tail, opacity, active: true }
}

function applyStrokeAttrs(
  p: SVGPathElement,
  opts: { color: string; strokeWidth: number; opacity: number; linecap: 'round' | 'butt' },
) {
  p.setAttribute('fill', 'none')
  p.setAttribute('stroke', opts.color)
  p.setAttribute('stroke-width', String(opts.strokeWidth))
  p.setAttribute('stroke-linecap', opts.linecap)
  p.setAttribute('stroke-linejoin', 'round')
  p.setAttribute('opacity', String(opts.opacity))
}

export function renderTrailAnim(svg: SVGSVGElement, state: TrailAnimState, absTimeSec: number) {
  while (svg.firstChild) svg.removeChild(svg.firstChild)

  // Gaussian blur filter, applied to every path when blur > 0.
  const filterId = 'trail-blur'
  if (state.blur > 0) {
    const defs = document.createElementNS(SVG_NS, 'defs')
    const filter = document.createElementNS(SVG_NS, 'filter')
    filter.setAttribute('id', filterId)
    filter.setAttribute('x', '-50%')
    filter.setAttribute('y', '-50%')
    filter.setAttribute('width', '200%')
    filter.setAttribute('height', '200%')
    const gaussian = document.createElementNS(SVG_NS, 'feGaussianBlur')
    gaussian.setAttribute('in', 'SourceGraphic')
    gaussian.setAttribute('stdDeviation', String(state.blur))
    filter.appendChild(gaussian)
    defs.appendChild(filter)
    svg.appendChild(defs)
  }
  const filterAttr = state.blur > 0 ? `url(#${filterId})` : null

  // Scene-level fade: ramps the whole group 0→1 at the start of the cycle and
  // 1→0 at the end. Wrapping everything in one <g opacity="…"> applies it once.
  const cycle = cycleDuration(state)
  const scenePhase = cycle > 0 ? absTimeSec / cycle : 0
  const sf = Math.max(0, Math.min(0.49, state.sceneFade))
  let sceneAlpha = 1
  if (sf > 0) {
    if (scenePhase < sf) sceneAlpha = scenePhase / sf
    else if (scenePhase > 1 - sf) sceneAlpha = (1 - scenePhase) / sf
  }
  const sceneGroup = document.createElementNS(SVG_NS, 'g')
  sceneGroup.setAttribute('opacity', String(sceneAlpha))
  svg.appendChild(sceneGroup)

  // Base guide paths (static) — rendered first so trails draw on top.
  if (state.showBase) {
    for (const d of state.paths) {
      const p = document.createElementNS(SVG_NS, 'path')
      p.setAttribute('d', d)
      applyStrokeAttrs(p, {
        color: state.baseColor,
        strokeWidth: state.strokeWidth,
        opacity: state.baseOpacity,
        linecap: 'round',
      })
      if (filterAttr) p.setAttribute('filter', filterAttr)
      sceneGroup.appendChild(p)
    }
  }

  // Trail paths: each trail sweeps a segment along the path via stroke-dasharray.
  // Using pathLength="1" normalises the path's total length to 1 so the dash
  // arithmetic is just fractions — independent of the actual path geometry.
  for (let i = 0; i < state.trailCount; i++) {
    const { head, tail, opacity, active } = trailPositions(state, i, absTimeSec)
    if (!active) continue
    const visibleLen = head - tail
    if (visibleLen <= 0.001) continue
    if (opacity <= 0.001) continue
    const color = state.trailColors[i % state.trailColors.length]

    for (const d of state.paths) {
      const trail = document.createElementNS(SVG_NS, 'path')
      trail.setAttribute('d', d)
      trail.setAttribute('pathLength', '1')
      // butt caps: no rounded "dots" at mid-path cuts. The base path below
      // keeps its round caps so actual path endpoints still look finished.
      applyStrokeAttrs(trail, {
        color,
        strokeWidth: state.strokeWidth,
        opacity,
        linecap: 'butt',
      })
      trail.setAttribute(
        'stroke-dasharray',
        `0 ${tail.toFixed(4)} ${visibleLen.toFixed(4)} ${(1 - head).toFixed(4)}`,
      )
      if (filterAttr) trail.setAttribute('filter', filterAttr)
      sceneGroup.appendChild(trail)
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
    const tNorm = k / SAMPLES
    // Tip travels 0 → (1 + trailLength) so the whole segment sweeps through
    // and off the end. Head saturates at 100% while tail catches up.
    const tip = eased[k] * (1 + trailLength)
    const head = Math.min(1, tip) * 100
    const tail = Math.max(0, Math.min(1, tip - trailLength)) * 100
    const frame = startFrame + tNorm * (endFrame - startFrame)
    sKeyframes.push({ t: frame, s: [tail] })
    eKeyframes.push({ t: frame, s: [head] })
  }

  // After endFrame the trail has fully exited — both anchors at 100, invisible
  // until the comp loops.
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
            lc: 1, // butt cap — no "dots" at mid-path cuts
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
    showBase,
    baseColor,
    strokeWidth,
    baseOpacity,
    trailCount,
    trailColors,
    trailLength,
    stagger,
    duration,
    easing,
    fps,
  } = state
  const cycleSec = cycleDuration(state)
  const totalFrames = Math.max(1, Math.round(cycleSec * fps))

  // Scale + center using the padded effective viewBox so strokes have room
  // to render without clipping (matches the live SVG preview exactly).
  const evb = effectiveViewBox(state)
  const scale = Math.min(canvasSize / evb.w, canvasSize / evb.h)
  const offsetX = (canvasSize - evb.w * scale) / 2 - evb.x * scale
  const offsetY = (canvasSize - evb.h * scale) / 2 - evb.y * scale

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
          strokeWidth: strokeWidth,
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
          strokeWidth: strokeWidth,
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
