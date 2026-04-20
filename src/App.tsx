import { useCallback, useEffect, useRef, useState } from 'react'
import lottie, { type AnimationItem } from 'lottie-web'
import {
  createDefaultState,
  cycleDuration,
  parseSvg,
  type TrailAnimState,
} from '@/lib/types'
import { buildTrailLottie, renderTrailAnim } from '@/lib/trail-anim'
import { ControlsPanel, type FocusedColorKey } from '@/components/ControlsPanel'

function App() {
  const [state, setState] = useState<TrailAnimState>(() => createDefaultState())
  const [focusedColorKey, setFocusedColorKey] = useState<FocusedColorKey>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const lottieMountRef = useRef<HTMLDivElement>(null)
  const lottieAnimRef = useRef<AnimationItem | null>(null)

  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const s = stateRef.current
      const elapsed = (now - start) / 1000
      const cycle = cycleDuration(s)
      const t = s.loop ? elapsed % cycle : Math.min(elapsed, cycle)
      if (svgRef.current) renderTrailAnim(svgRef.current, s, t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleUploadSvg = useCallback(async (file: File) => {
    const text = await file.text()
    const parsed = parseSvg(text)
    if (!parsed) {
      alert('Could not parse SVG. Make sure it has at least one <path> element.')
      return
    }
    setState((prev) => ({
      ...prev,
      svgFileName: file.name,
      viewBox: parsed.viewBox,
      paths: parsed.paths,
    }))
  }, [])

  const handleExportLottie = useCallback(() => {
    const s = stateRef.current
    const json = buildTrailLottie(s)
    if (lottieAnimRef.current) {
      lottieAnimRef.current.destroy()
      lottieAnimRef.current = null
    }
    if (lottieMountRef.current) {
      lottieMountRef.current.innerHTML = ''
      lottieAnimRef.current = lottie.loadAnimation({
        container: lottieMountRef.current,
        renderer: 'svg',
        loop: s.loop,
        autoplay: true,
        animationData: json,
      })
    }
    const blob = new Blob([JSON.stringify(json)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `signal-trail-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExportVideo = useCallback(async () => {
    const s = stateRef.current
    const cycle = cycleDuration(s)
    const frames = Math.max(1, Math.round(cycle * s.fps))

    const offscreenSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
    offscreenSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    offscreenSvg.setAttribute('viewBox', `${s.viewBox.x} ${s.viewBox.y} ${s.viewBox.w} ${s.viewBox.h}`)
    offscreenSvg.setAttribute('width', String(s.canvasSize))
    offscreenSvg.setAttribute('height', String(s.canvasSize))

    const canvas = document.createElement('canvas')
    canvas.width = s.canvasSize
    canvas.height = s.canvasSize
    const ctx = canvas.getContext('2d')!

    const stream = canvas.captureStream(s.fps)
    // Prefer MP4/H.264 when the browser supports it (Chrome, Edge, Safari).
    // Fall back to WebM on Firefox and older browsers. The file extension
    // follows whatever MediaRecorder actually produced.
    const mimeCandidates = [
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4;codecs=avc1',
      'video/mp4;codecs=h264',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ]
    const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || ''
    const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm'
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime || `video/${ext}` }))
    })
    recorder.start()

    const msPerFrame = 1000 / s.fps

    for (let f = 0; f < frames; f++) {
      const t = (f / frames) * cycle
      renderTrailAnim(offscreenSvg, s, t)
      const xml = new XMLSerializer().serializeToString(offscreenSvg)
      const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      const img = new Image()
      await new Promise((res, rej) => {
        img.onload = () => res(null)
        img.onerror = rej
        img.src = url
      })
      if (s.transparentBg) {
        ctx.clearRect(0, 0, s.canvasSize, s.canvasSize)
      } else {
        ctx.fillStyle = s.bgColor
        ctx.fillRect(0, 0, s.canvasSize, s.canvasSize)
      }
      ctx.drawImage(img, 0, 0, s.canvasSize, s.canvasSize)
      URL.revokeObjectURL(url)
      await new Promise((r) => setTimeout(r, msPerFrame))
    }

    recorder.stop()
    const blob = await done
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `signal-trail-${Date.now()}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const applyColorToFocused = useCallback((hex: string) => {
    if (!focusedColorKey) return
    setState((prev) => {
      if (focusedColorKey.kind === 'trail') {
        const next = [...prev.trailColors]
        next[focusedColorKey.index] = hex
        return { ...prev, trailColors: next }
      }
      if (focusedColorKey.kind === 'bg') return { ...prev, bgColor: hex }
      if (focusedColorKey.kind === 'base') return { ...prev, baseColor: hex }
      return prev
    })
  }, [focusedColorKey])

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 px-6 py-4">
        <h1 className="text-sm font-semibold tracking-tight">Signal Playground — Trail</h1>
      </header>

      <main className="grid grid-cols-[1fr_360px] gap-8 p-8 items-start">
        <section className="sticky top-8 flex flex-col items-center gap-6">
          <PreviewCard label="Live preview">
            <svg
              ref={svgRef}
              viewBox={`${state.viewBox.x} ${state.viewBox.y} ${state.viewBox.w} ${state.viewBox.h}`}
              preserveAspectRatio="xMidYMid meet"
              style={{
                width: state.canvasSize,
                height: state.canvasSize,
                background: state.bgColor,
              }}
            />
          </PreviewCard>

          <PreviewCard label="Lottie preview (of last export)">
            <div
              ref={lottieMountRef}
              style={{
                width: state.canvasSize,
                height: state.canvasSize,
                background: state.bgColor,
              }}
            />
          </PreviewCard>
        </section>

        <aside>
          <ControlsPanel
            state={state}
            setState={setState}
            focusedColorKey={focusedColorKey}
            setFocusedColorKey={setFocusedColorKey}
            onApplySwatch={applyColorToFocused}
            onUploadSvg={handleUploadSvg}
            onExportLottie={handleExportLottie}
            onExportVideo={handleExportVideo}
          />
        </aside>
      </main>
    </div>
  )
}

function PreviewCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <span className="text-[10px] uppercase tracking-[0.08em] text-neutral-500">{label}</span>
      <div className="flex items-center justify-center">{children}</div>
    </div>
  )
}

export default App
