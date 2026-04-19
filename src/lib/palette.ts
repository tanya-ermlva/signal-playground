export const PALETTE = {
  neutralsLight: ['#EBEBE4', '#F2F2EC', '#F8F8F3', '#FCFCF9', '#FFFFFF'],
  neutralsDark: ['#1E1E1E', '#333332', '#686865', '#898985', '#A9A9A5', '#D9D9D9'],
  primary: ['#434625', '#5B6F00', '#788C15', '#B2C248', '#D1E043', '#E5EACD'],
  blues: ['#3E49B8', '#4691E2', '#B8D5FF', '#D2E4F8'],
  reds: ['#BD4A30', '#E95D3D', '#F29E8B', '#F8CEC5'],
  purples: ['#564391', '#A191CE', '#CEBEF8', '#E8E4F3'],
  oranges: ['#8B4E23', '#ED9212', '#FFB567', '#FFEAA6'],
  pinks: ['#A42962', '#FF91E0', '#FFBCEF', '#FFDEF6'],
  khaki: ['#40351A', '#B89F56', '#E5CD75', '#EDE1A1'],
} as const

export type PaletteGroupKey = keyof typeof PALETTE

export const PALETTE_GROUPS: Array<{ label: string; key: PaletteGroupKey }> = [
  { label: 'Neutrals light', key: 'neutralsLight' },
  { label: 'Neutrals dark', key: 'neutralsDark' },
  { label: 'Primary', key: 'primary' },
  { label: 'Secondary — blues', key: 'blues' },
  { label: 'Secondary — reds', key: 'reds' },
  { label: 'Secondary — purples', key: 'purples' },
  { label: 'Secondary — oranges', key: 'oranges' },
  { label: 'Secondary — pinks', key: 'pinks' },
  { label: 'Secondary — khaki', key: 'khaki' },
]

const BLACK = '#1E1E1E'

function padToTen(colors: readonly string[]): string[] {
  const out = colors.slice(0, 10)
  while (out.length < 10) out.push(BLACK)
  return out
}

export const PRESETS: Record<string, () => string[]> = {
  'All black': () => Array(10).fill(BLACK),
  'Primary gradient': () => padToTen(PALETTE.primary),
  'Mono light → dark': () => padToTen([...([...PALETTE.neutralsLight].reverse() as string[]), ...PALETTE.neutralsDark]),
  'Warm reds': () => padToTen(PALETTE.reds),
  'Cool blues': () => padToTen(PALETTE.blues),
  Rainbow: () => padToTen([
    PALETTE.reds[1],
    PALETTE.oranges[1],
    PALETTE.primary[1],
    PALETTE.blues[1],
    PALETTE.purples[1],
    PALETTE.pinks[1],
  ]),
}

export function applyPreset(name: string): string[] {
  const fn = PRESETS[name]
  if (!fn) return Array(10).fill(BLACK)
  return fn()
}
