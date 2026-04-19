// Easings from https://easings.net — canonical formulations.
// All take t in [0, 1] and return eased value in [0, 1].

export type EasingName =
  | 'linear'
  | 'easeInSine' | 'easeOutSine' | 'easeInOutSine'
  | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad'
  | 'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic'
  | 'easeInQuart' | 'easeOutQuart' | 'easeInOutQuart'
  | 'easeInQuint' | 'easeOutQuint' | 'easeInOutQuint'
  | 'easeInExpo' | 'easeOutExpo' | 'easeInOutExpo'
  | 'easeInCirc' | 'easeOutCirc' | 'easeInOutCirc'
  | 'easeInBack' | 'easeOutBack' | 'easeInOutBack'

const c1 = 1.70158
const c2 = c1 * 1.525
const c3 = c1 + 1

export const EASINGS: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,

  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),

  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),

  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),

  easeInQuint: (t) => t * t * t * t * t,
  easeOutQuint: (t) => 1 - Math.pow(1 - t, 5),
  easeInOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),

  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) =>
    t === 0 ? 0 :
    t === 1 ? 1 :
    t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 :
    (2 - Math.pow(2, -20 * t + 10)) / 2,

  easeInCirc: (t) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
  easeOutCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  easeInOutCirc: (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,

  easeInBack: (t) => c3 * t * t * t - c1 * t * t,
  easeOutBack: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  easeInOutBack: (t) =>
    t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2,
}

export const EASING_GROUPS: Array<{ label: string; names: EasingName[] }> = [
  { label: 'Linear', names: ['linear'] },
  { label: 'Sine', names: ['easeInSine', 'easeOutSine', 'easeInOutSine'] },
  { label: 'Quad', names: ['easeInQuad', 'easeOutQuad', 'easeInOutQuad'] },
  { label: 'Cubic', names: ['easeInCubic', 'easeOutCubic', 'easeInOutCubic'] },
  { label: 'Quart', names: ['easeInQuart', 'easeOutQuart', 'easeInOutQuart'] },
  { label: 'Quint', names: ['easeInQuint', 'easeOutQuint', 'easeInOutQuint'] },
  { label: 'Expo', names: ['easeInExpo', 'easeOutExpo', 'easeInOutExpo'] },
  { label: 'Circ', names: ['easeInCirc', 'easeOutCirc', 'easeInOutCirc'] },
  { label: 'Back', names: ['easeInBack', 'easeOutBack', 'easeInOutBack'] },
]

// Sample an easing at N points — used to bake keyframes for Lottie since
// Lottie's native bezier tangents can't represent back/elastic-style overshoots.
export function sampleEasing(name: EasingName, steps: number): number[] {
  const fn = EASINGS[name]
  const out: number[] = []
  for (let i = 0; i <= steps; i++) out.push(fn(i / steps))
  return out
}
