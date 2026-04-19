# signal-playground

Browser-based playground for designing **trim-path trail animations** — upload an
SVG, and watch N colored "pens" sweep along its paths with configurable stagger,
length, and easing. Export as Lottie JSON or WebM video.

Live: [https://tanya-ermlva.github.io/signal-playground/](https://tanya-ermlva.github.io/signal-playground/)

## What it does

1. **Upload an SVG** (any file with `<path>` elements — logo outlines, handwritten
   signatures, icon linework, etc.).
2. **Tweak** the animation: number of trails, trail length (% of path), stagger,
   duration, easing (25 curves from easings.net), stroke width, per-trail colors.
3. **Preview** the animation live, and see the exported Lottie playing side-by-side.
4. **Export** a Lottie JSON (plays in any Lottie runtime — After Effects, Lottiefiles,
   web players) or a WebM video.

## Running locally

```sh
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173` or `5174`).

## How the animation works

**Rendering (live SVG preview).** For each trail *i* at absolute time *t*:

- Compute the eased progress *p* = easing((t − i · stagger) / duration).
- The trail's head is at fraction *p* along the path; its tail is at max(0, *p* − trailLength).
- Render a copy of the path with `pathLength="1"` and
  `stroke-dasharray="0 tail visible (1−head)"`, which shows only the segment
  between tail and head.

**Lottie export.** Each path is sampled with `getPointAtLength()` into a
200-vertex polyline. Each trail becomes a shape layer with:

- The path (as a Lottie shape with flat tangents — polyline).
- A `trim-path` modifier with animated `start` and `end` that sweep from 0% to 100%.
- A static stroke color and width.

The easing is baked as 30 keyframes per trail, so curves with overshoot (the
`back` family) render faithfully — Lottie's native bezier tangents can't
express a non-monotonic curve directly.

## Stack

- **Vite 6 + React 19 + TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Nova preset, Radix primitives, Geist font)
- **lottie-web** for the verification preview
- **react-colorful** for the color pickers

## File layout

```
src/
  lib/
    types.ts          TrailAnimState shape + parseSvg()
    trail-anim.ts     renderTrailAnim (SVG) + buildTrailLottie (JSON)
    easings.ts        25 easings.net curves + sampling helper
    palette.ts        Brand palette + groupings for the swatch grid
  components/
    ControlsPanel.tsx Full shadcn sidebar (SVG upload, sliders, palette, exports)
    ui/               shadcn components
  App.tsx             Layout, rAF preview loop, export handlers
```

## Deploy

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds the Vite
app and deploys `dist/` to GitHub Pages.
