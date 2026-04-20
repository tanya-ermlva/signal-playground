import { useRef, type Dispatch, type SetStateAction, type ChangeEvent } from 'react'
import { HexColorPicker } from 'react-colorful'
import { PALETTE, PALETTE_GROUPS } from '@/lib/palette'
import type { TrailAnimState } from '@/lib/types'
import type { EasingName } from '@/lib/easings'
import { EASING_GROUPS } from '@/lib/easings'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type FocusedColorKey =
  | { kind: 'trail'; index: number }
  | { kind: 'bg' }
  | { kind: 'base' }
  | null

interface Props {
  state: TrailAnimState
  setState: Dispatch<SetStateAction<TrailAnimState>>
  focusedColorKey: FocusedColorKey
  setFocusedColorKey: Dispatch<SetStateAction<FocusedColorKey>>
  onApplySwatch: (hex: string) => void
  onUploadSvg: (file: File) => Promise<void> | void
  onExportVideo: () => void
}

export function ControlsPanel({
  state,
  setState,
  focusedColorKey,
  setFocusedColorKey,
  onApplySwatch,
  onUploadSvg,
  onExportVideo,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const update = <K extends keyof TrailAnimState>(key: K, value: TrailAnimState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  const setTrailColor = (index: number, hex: string) => {
    setState((prev) => {
      const next = [...prev.trailColors]
      next[index] = hex
      return { ...prev, trailColors: next }
    })
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) await onUploadSvg(f)
    // Reset input so re-selecting the same file still triggers change
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <Section title="Source">
        <Tabs
          value={state.source}
          onValueChange={(v) => update('source', v as TrailAnimState['source'])}
        >
          <TabsList className="grid grid-cols-3 gap-1 w-full h-auto">
            <TabsTrigger value="upload" className="text-xs">Upload</TabsTrigger>
            <TabsTrigger value="lissajous" className="text-xs">Lissajous</TabsTrigger>
            <TabsTrigger value="scribble" className="text-xs">Scribble</TabsTrigger>
            <TabsTrigger value="shape" className="text-xs">Shapes</TabsTrigger>
            <TabsTrigger value="asterisk" className="text-xs">Asterisk</TabsTrigger>
            <TabsTrigger value="burst" className="text-xs">Burst</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="flex flex-col gap-2 mt-3">
            <div className="text-xs text-neutral-500 truncate">{state.svgFileName}</div>
            <input
              ref={fileRef}
              type="file"
              accept=".svg,image/svg+xml"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full">
              Upload SVG…
            </Button>
            <div className="text-[10px] text-neutral-400">
              {state.paths.length} path{state.paths.length === 1 ? '' : 's'} · viewBox {Math.round(state.viewBox.w)} × {Math.round(state.viewBox.h)}
            </div>
          </TabsContent>

          <TabsContent value="lissajous" className="flex flex-col gap-3 mt-3">
            <SliderRow
              label="Freq X"
              value={state.lissajous.freqX}
              min={1}
              max={8}
              step={1}
              onChange={(v) => setState((p) => ({ ...p, lissajous: { ...p.lissajous, freqX: v } }))}
              format={(v) => String(v)}
            />
            <SliderRow
              label="Freq Y"
              value={state.lissajous.freqY}
              min={1}
              max={8}
              step={1}
              onChange={(v) => setState((p) => ({ ...p, lissajous: { ...p.lissajous, freqY: v } }))}
              format={(v) => String(v)}
            />
            <SliderRow
              label="Phase"
              value={state.lissajous.phase}
              min={0}
              max={Math.PI}
              step={0.01}
              onChange={(v) => setState((p) => ({ ...p, lissajous: { ...p.lissajous, phase: v } }))}
              format={(v) => `${((v / Math.PI) * 180).toFixed(0)}°`}
            />
            <SliderRow
              label="Amplitude"
              value={state.lissajous.amplitude}
              min={0.3}
              max={0.95}
              step={0.01}
              onChange={(v) => setState((p) => ({ ...p, lissajous: { ...p.lissajous, amplitude: v } }))}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Row>
              <Label htmlFor="animatePhase">Animate phase</Label>
              <Switch
                id="animatePhase"
                checked={state.lissajous.animatePhase}
                onCheckedChange={(v) =>
                  setState((p) => ({ ...p, lissajous: { ...p.lissajous, animatePhase: v } }))
                }
              />
            </Row>

            <div className="text-[10px] uppercase tracking-wide text-neutral-500 pt-2">Humanize</div>
            <SliderRow
              label="Decay (spiral)"
              value={state.lissajous.decay}
              min={0}
              max={1.5}
              step={0.05}
              onChange={(v) => setState((p) => ({ ...p, lissajous: { ...p.lissajous, decay: v } }))}
              format={(v) => (v === 0 ? 'off' : v.toFixed(2))}
            />
            <SliderRow
              label="Harmonic strength"
              value={state.lissajous.harmonic}
              min={0}
              max={0.4}
              step={0.01}
              onChange={(v) => setState((p) => ({ ...p, lissajous: { ...p.lissajous, harmonic: v } }))}
              format={(v) => (v === 0 ? 'off' : `${Math.round(v * 100)}%`)}
            />
            <SliderRow
              label="Harmonic ×"
              value={state.lissajous.harmonicMul}
              min={2}
              max={6}
              step={1}
              onChange={(v) => setState((p) => ({ ...p, lissajous: { ...p.lissajous, harmonicMul: v } }))}
              format={(v) => `${v}×`}
            />
            <SliderRow
              label="Jitter"
              value={state.lissajous.jitter}
              min={0}
              max={5}
              step={0.1}
              onChange={(v) => setState((p) => ({ ...p, lissajous: { ...p.lissajous, jitter: v } }))}
              format={(v) => (v === 0 ? 'off' : `${v.toFixed(1)}px`)}
            />
            <SliderRow
              label="Freq drift"
              value={state.lissajous.drift}
              min={0}
              max={1.5}
              step={0.05}
              onChange={(v) => setState((p) => ({ ...p, lissajous: { ...p.lissajous, drift: v } }))}
              format={(v) => (v === 0 ? 'off' : v.toFixed(2))}
            />
          </TabsContent>

          <TabsContent value="scribble" className="flex flex-col gap-3 mt-3">
            <SliderRow
              label="Freq X"
              value={state.scribble.freqX}
              min={1}
              max={8}
              step={1}
              onChange={(v) => setState((p) => ({ ...p, scribble: { ...p.scribble, freqX: v } }))}
              format={(v) => String(v)}
            />
            <SliderRow
              label="Freq Y"
              value={state.scribble.freqY}
              min={1}
              max={8}
              step={1}
              onChange={(v) => setState((p) => ({ ...p, scribble: { ...p.scribble, freqY: v } }))}
              format={(v) => String(v)}
            />
            <SliderRow
              label="Amplitude"
              value={state.scribble.amplitude}
              min={0.3}
              max={0.95}
              step={0.01}
              onChange={(v) => setState((p) => ({ ...p, scribble: { ...p.scribble, amplitude: v } }))}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderRow
              label="Complexity"
              value={state.scribble.complexity}
              min={1}
              max={6}
              step={1}
              onChange={(v) => setState((p) => ({ ...p, scribble: { ...p.scribble, complexity: v } }))}
              format={(v) => `${v} harmonic${v === 1 ? '' : 's'}`}
            />
            <SliderRow
              label="Chaos"
              value={state.scribble.chaos}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => setState((p) => ({ ...p, scribble: { ...p.scribble, chaos: v } }))}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderRow
              label="Jitter"
              value={state.scribble.jitter}
              min={0}
              max={8}
              step={0.1}
              onChange={(v) => setState((p) => ({ ...p, scribble: { ...p.scribble, jitter: v } }))}
              format={(v) => (v === 0 ? 'off' : `${v.toFixed(1)}px`)}
            />
            <Row>
              <Label>Seed</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setState((p) => ({
                    ...p,
                    scribble: { ...p.scribble, seed: Math.floor(Math.random() * 10000) },
                  }))
                }
              >
                Reroll ({state.scribble.seed})
              </Button>
            </Row>
            <Row>
              <Label htmlFor="scribbleAnimate">Animate phase</Label>
              <Switch
                id="scribbleAnimate"
                checked={state.scribble.animatePhase}
                onCheckedChange={(v) =>
                  setState((p) => ({ ...p, scribble: { ...p.scribble, animatePhase: v } }))
                }
              />
            </Row>
          </TabsContent>

          <TabsContent value="shape" className="flex flex-col gap-3 mt-3">
            <Row>
              <Label>Shape</Label>
              <Select
                value={state.shape.kind}
                onValueChange={(v) =>
                  setState((p) => ({
                    ...p,
                    shape: { ...p.shape, kind: v as typeof p.shape.kind },
                  }))
                }
              >
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="circle">Circle</SelectItem>
                  <SelectItem value="infinity">Infinity</SelectItem>
                  <SelectItem value="heart">Heart</SelectItem>
                  <SelectItem value="rose">Rose (flower)</SelectItem>
                  <SelectItem value="star">Star</SelectItem>
                  <SelectItem value="butterfly">Butterfly</SelectItem>
                  <SelectItem value="spiral">Spiral</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <SliderRow
              label="Amplitude"
              value={state.shape.amplitude}
              min={0.3}
              max={0.95}
              step={0.01}
              onChange={(v) => setState((p) => ({ ...p, shape: { ...p.shape, amplitude: v } }))}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            {(state.shape.kind === 'rose' || state.shape.kind === 'star' || state.shape.kind === 'spiral') && (
              <SliderRow
                label={state.shape.kind === 'spiral' ? 'Windings' : 'Petals / points'}
                value={state.shape.petals}
                min={2}
                max={10}
                step={1}
                onChange={(v) => setState((p) => ({ ...p, shape: { ...p.shape, petals: v } }))}
                format={(v) => String(v)}
              />
            )}
            <SliderRow
              label="Rotation"
              value={state.shape.rotation}
              min={0}
              max={Math.PI * 2}
              step={0.01}
              onChange={(v) => setState((p) => ({ ...p, shape: { ...p.shape, rotation: v } }))}
              format={(v) => `${((v / Math.PI) * 180).toFixed(0)}°`}
            />
            <Row>
              <Label htmlFor="shapeAnimate">Animate rotation</Label>
              <Switch
                id="shapeAnimate"
                checked={state.shape.animateRotation}
                onCheckedChange={(v) =>
                  setState((p) => ({ ...p, shape: { ...p.shape, animateRotation: v } }))
                }
              />
            </Row>
          </TabsContent>

          <TabsContent value="asterisk" className="flex flex-col gap-3 mt-3">
            <SliderRow
              label="Rays"
              value={state.asterisk.rays}
              min={3}
              max={24}
              step={1}
              onChange={(v) => setState((p) => ({ ...p, asterisk: { ...p.asterisk, rays: v } }))}
              format={(v) => String(v)}
            />
            <Row>
              <Label htmlFor="asteriskEven">Even angles</Label>
              <Switch
                id="asteriskEven"
                checked={state.asterisk.evenAngles}
                onCheckedChange={(v) =>
                  setState((p) => ({ ...p, asterisk: { ...p.asterisk, evenAngles: v } }))
                }
              />
            </Row>
            <SliderRow
              label="Ray length"
              value={state.asterisk.armLength}
              min={0.1}
              max={0.95}
              step={0.02}
              onChange={(v) => setState((p) => ({ ...p, asterisk: { ...p.asterisk, armLength: v } }))}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderRow
              label="Length variance"
              value={state.asterisk.armVariance}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => setState((p) => ({ ...p, asterisk: { ...p.asterisk, armVariance: v } }))}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderRow
              label="Inner gap"
              value={state.asterisk.innerGap}
              min={0}
              max={0.5}
              step={0.01}
              onChange={(v) => setState((p) => ({ ...p, asterisk: { ...p.asterisk, innerGap: v } }))}
              format={(v) => (v === 0 ? 'touch center' : `${Math.round(v * 100)}%`)}
            />
            <SliderRow
              label="Ray duration"
              value={state.asterisk.rayDuration}
              min={0.2}
              max={2}
              step={0.05}
              onChange={(v) => setState((p) => ({ ...p, asterisk: { ...p.asterisk, rayDuration: v } }))}
              format={(v) => `${v.toFixed(2)}s`}
            />
            <SliderRow
              label="Ray stagger"
              value={state.asterisk.rayStagger}
              min={0}
              max={0.3}
              step={0.01}
              onChange={(v) => setState((p) => ({ ...p, asterisk: { ...p.asterisk, rayStagger: v } }))}
              format={(v) => `${v.toFixed(2)}s`}
            />
            <SliderRow
              label="Trail length"
              value={state.asterisk.trailLength}
              min={0.1}
              max={1}
              step={0.05}
              onChange={(v) => setState((p) => ({ ...p, asterisk: { ...p.asterisk, trailLength: v } }))}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderRow
              label="Rotation"
              value={state.asterisk.rotation}
              min={0}
              max={Math.PI * 2}
              step={0.01}
              onChange={(v) => setState((p) => ({ ...p, asterisk: { ...p.asterisk, rotation: v } }))}
              format={(v) => `${((v / Math.PI) * 180).toFixed(0)}°`}
            />
            <Row>
              <Label htmlFor="asteriskAnimateRot">Animate rotation</Label>
              <Switch
                id="asteriskAnimateRot"
                checked={state.asterisk.animateRotation}
                onCheckedChange={(v) =>
                  setState((p) => ({ ...p, asterisk: { ...p.asterisk, animateRotation: v } }))
                }
              />
            </Row>
            <Row>
              <Label htmlFor="asteriskDot">Center dot</Label>
              <Switch
                id="asteriskDot"
                checked={state.asterisk.centerDot}
                onCheckedChange={(v) =>
                  setState((p) => ({ ...p, asterisk: { ...p.asterisk, centerDot: v } }))
                }
              />
            </Row>
            {state.asterisk.centerDot && (
              <SliderRow
                label="Dot radius"
                value={state.asterisk.centerDotRadius}
                min={1}
                max={12}
                step={0.5}
                onChange={(v) => setState((p) => ({ ...p, asterisk: { ...p.asterisk, centerDotRadius: v } }))}
                format={(v) => `${v}px`}
              />
            )}
            {!state.asterisk.evenAngles && (
              <Row>
                <Label>Seed</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setState((p) => ({
                      ...p,
                      asterisk: { ...p.asterisk, seed: Math.floor(Math.random() * 10000) },
                    }))
                  }
                >
                  Reroll ({state.asterisk.seed})
                </Button>
              </Row>
            )}
          </TabsContent>

          <TabsContent value="burst" className="flex flex-col gap-3 mt-3">
            <SliderRow
              label="Burst count"
              value={state.burst.count}
              min={1}
              max={16}
              step={1}
              onChange={(v) => setState((p) => ({ ...p, burst: { ...p.burst, count: v } }))}
              format={(v) => String(v)}
            />
            <SliderRow
              label="Rays per burst"
              value={state.burst.rays}
              min={3}
              max={24}
              step={1}
              onChange={(v) => setState((p) => ({ ...p, burst: { ...p.burst, rays: v } }))}
              format={(v) => String(v)}
            />
            <Row>
              <Label htmlFor="burstEven">Even angles</Label>
              <Switch
                id="burstEven"
                checked={state.burst.evenAngles}
                onCheckedChange={(v) =>
                  setState((p) => ({ ...p, burst: { ...p.burst, evenAngles: v } }))
                }
              />
            </Row>
            <SliderRow
              label="Ray length"
              value={state.burst.armLength}
              min={0.1}
              max={0.9}
              step={0.02}
              onChange={(v) => setState((p) => ({ ...p, burst: { ...p.burst, armLength: v } }))}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderRow
              label="Length variance"
              value={state.burst.armVariance}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => setState((p) => ({ ...p, burst: { ...p.burst, armVariance: v } }))}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderRow
              label="Inner gap"
              value={state.burst.innerGap}
              min={0}
              max={0.5}
              step={0.01}
              onChange={(v) => setState((p) => ({ ...p, burst: { ...p.burst, innerGap: v } }))}
              format={(v) => (v === 0 ? 'touch center' : `${Math.round(v * 100)}%`)}
            />
            <SliderRow
              label="Spread"
              value={state.burst.spread}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => setState((p) => ({ ...p, burst: { ...p.burst, spread: v } }))}
              format={(v) => (v === 0 ? 'centered' : `${Math.round(v * 100)}%`)}
            />
            <SliderRow
              label="Burst duration"
              value={state.burst.burstDuration}
              min={0.2}
              max={2}
              step={0.05}
              onChange={(v) => setState((p) => ({ ...p, burst: { ...p.burst, burstDuration: v } }))}
              format={(v) => `${v.toFixed(2)}s`}
            />
            <SliderRow
              label="Trail length"
              value={state.burst.trailLength}
              min={0.1}
              max={1}
              step={0.05}
              onChange={(v) => setState((p) => ({ ...p, burst: { ...p.burst, trailLength: v } }))}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Row>
              <Label htmlFor="burstDot">Center dot</Label>
              <Switch
                id="burstDot"
                checked={state.burst.centerDot}
                onCheckedChange={(v) =>
                  setState((p) => ({ ...p, burst: { ...p.burst, centerDot: v } }))
                }
              />
            </Row>
            {state.burst.centerDot && (
              <SliderRow
                label="Dot radius"
                value={state.burst.centerDotRadius}
                min={1}
                max={12}
                step={0.5}
                onChange={(v) => setState((p) => ({ ...p, burst: { ...p.burst, centerDotRadius: v } }))}
                format={(v) => `${v}px`}
              />
            )}
            <Row>
              <Label>Seed</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setState((p) => ({
                    ...p,
                    burst: { ...p.burst, seed: Math.floor(Math.random() * 10000) },
                  }))
                }
              >
                Reroll ({state.burst.seed})
              </Button>
            </Row>
          </TabsContent>
        </Tabs>
      </Section>

      <Separator />

      <Section title="Animation">
        <Row>
          <Label htmlFor="loop">Loop</Label>
          <Switch id="loop" checked={state.loop} onCheckedChange={(v) => update('loop', v)} />
        </Row>
        <SliderRow
          label="Trail count"
          value={state.trailCount}
          min={1}
          max={6}
          step={1}
          onChange={(v) => update('trailCount', v)}
          format={(v) => String(v)}
        />
        <SliderRow
          label="Trail length"
          value={state.trailLength}
          min={0.05}
          max={0.8}
          step={0.01}
          onChange={(v) => update('trailLength', v)}
          format={(v) => `${Math.round(v * 100)}% of path`}
        />
        <SliderRow
          label="Trail fade in/out"
          value={state.trailFade}
          min={0}
          max={0.45}
          step={0.01}
          onChange={(v) => update('trailFade', v)}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <SliderRow
          label="Scene fade in/out"
          value={state.sceneFade}
          min={0}
          max={0.45}
          step={0.01}
          onChange={(v) => update('sceneFade', v)}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <SliderRow
          label="Stroke width"
          value={state.strokeWidth}
          min={1}
          max={32}
          step={0.5}
          onChange={(v) => update('strokeWidth', v)}
          format={(v) => `${v}px`}
        />
        <Row>
          <Label>Line cap</Label>
          <Select
            value={state.linecap}
            onValueChange={(v) => update('linecap', v as TrailAnimState['linecap'])}
          >
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="round">Round</SelectItem>
              <SelectItem value="butt">Butt</SelectItem>
              <SelectItem value="square">Square</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <SliderRow
          label="Blur"
          value={state.blur}
          min={0}
          max={16}
          step={0.5}
          onChange={(v) => update('blur', v)}
          format={(v) => (v === 0 ? 'off' : `${v}px`)}
        />
        <SliderRow
          label="Duration"
          value={state.duration}
          min={0.3}
          max={5}
          step={0.1}
          onChange={(v) => update('duration', v)}
          format={(v) => `${v.toFixed(1)}s`}
        />
        <SliderRow
          label="Stagger"
          value={state.stagger}
          min={0}
          max={1.5}
          step={0.05}
          onChange={(v) => update('stagger', v)}
          format={(v) => `${v.toFixed(2)}s`}
        />
        <Row>
          <Label>Easing</Label>
          <Select value={state.easing} onValueChange={(v) => update('easing', v as EasingName)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-80">
              {EASING_GROUPS.map((g) => (
                <SelectGroup key={g.label}>
                  <SelectLabel>{g.label}</SelectLabel>
                  {g.names.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Row>
      </Section>

      <Separator />

      <Section title="Trail colors">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: state.trailCount }).map((_, i) => (
            <ColorSwatchButton
              key={i}
              color={state.trailColors[i % state.trailColors.length]}
              label={`Trail ${i + 1}`}
              isFocused={focusedColorKey?.kind === 'trail' && focusedColorKey.index === i}
              onFocus={() => setFocusedColorKey({ kind: 'trail', index: i })}
              onColorChange={(hex) => setTrailColor(i, hex)}
            />
          ))}
        </div>
      </Section>

      <Separator />

      <Section title="Base path">
        <Row>
          <Label htmlFor="showBase">Show base</Label>
          <Switch
            id="showBase"
            checked={state.showBase}
            onCheckedChange={(v) => update('showBase', v)}
          />
        </Row>
        {state.showBase && (
          <>
            <Row>
              <Label>Color</Label>
              <ColorSwatchButton
                color={state.baseColor}
                label="Base color"
                isFocused={focusedColorKey?.kind === 'base'}
                onFocus={() => setFocusedColorKey({ kind: 'base' })}
                onColorChange={(hex) => update('baseColor', hex)}
              />
            </Row>
            <SliderRow
              label="Base opacity"
              value={state.baseOpacity}
              min={0.05}
              max={1}
              step={0.05}
              onChange={(v) => update('baseOpacity', v)}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </>
        )}
      </Section>

      <Separator />

      <Section title="Palette">
        <p className="text-xs text-neutral-500">
          Click a swatch to apply it to the focused color picker.
        </p>
        <div className="flex flex-col gap-3">
          {PALETTE_GROUPS.map((g) => (
            <div key={g.key}>
              <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">{g.label}</div>
              <div className="grid grid-cols-6 gap-1">
                {PALETTE[g.key].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    title={hex}
                    onClick={() => onApplySwatch(hex)}
                    className="h-5 rounded-sm border border-neutral-200 hover:scale-110 transition-transform"
                    style={{ background: hex }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Separator />

      <Section title="Canvas">
        <SliderRow
          label="Size"
          value={state.canvasSize}
          min={64}
          max={512}
          step={4}
          onChange={(v) => update('canvasSize', v)}
          format={(v) => `${v}px`}
        />
        <Row>
          <Label>Background</Label>
          <ColorSwatchButton
            color={state.bgColor}
            label="Background"
            isFocused={focusedColorKey?.kind === 'bg'}
            onFocus={() => setFocusedColorKey({ kind: 'bg' })}
            onColorChange={(hex) => update('bgColor', hex)}
          />
        </Row>
        <Row>
          <Label htmlFor="transparent">Transparent bg (export)</Label>
          <Switch
            id="transparent"
            checked={state.transparentBg}
            onCheckedChange={(v) => update('transparentBg', v)}
          />
        </Row>
        <Row>
          <Label>FPS</Label>
          <Select value={String(state.fps)} onValueChange={(v) => update('fps', Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="60">60</SelectItem>
            </SelectContent>
          </Select>
        </Row>
      </Section>

      <Separator />

      <div className="flex flex-col gap-2">
        <Button onClick={onExportVideo} className="w-full">Export Video (MP4 or WebM)</Button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-700">{title}</h2>
      {children}
    </section>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3">{children}</div>
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-xs tabular-nums text-neutral-500">{format(value)}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  )
}

function ColorSwatchButton({
  color,
  label,
  isFocused,
  onFocus,
  onColorChange,
}: {
  color: string
  label: string
  isFocused: boolean
  onFocus: () => void
  onColorChange: (hex: string) => void
}) {
  return (
    <Popover onOpenChange={(open) => open && onFocus()}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={`h-8 w-full rounded-md border transition-all ${
            isFocused ? 'ring-2 ring-neutral-900 ring-offset-2' : 'border-neutral-200'
          }`}
          style={{ background: color }}
          onClick={onFocus}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" side="left">
        <HexColorPicker color={color} onChange={onColorChange} />
        <div className="mt-2 text-center text-xs font-mono text-neutral-500">{color}</div>
      </PopoverContent>
    </Popover>
  )
}
