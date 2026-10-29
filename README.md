# VANTA — Reality Engine / 001

An interactive WebGL instrument: sculpt the visual physics of space, light and matter with the pointer.
A procedural liquid-metal black-hole artifact, an accretion ring and a 24k-particle matter field all
evaluate one shared GLSL force-field model, fed by a ring buffer of pointer impulses.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
npm run typecheck
```

Requires a browser with **WebGL 2** (a fallback screen is shown otherwise).

## Controls

| Input | Effect |
| --- | --- |
| Move | Space bends around the cursor, matter is deflected, traces ripple outward |
| Hold LMB | Gravity anomaly: matter collapses into a swirling vortex, the artifact is tidally stretched |
| Fast flick | Shock front propagating through particles, ring and surface |
| `1` `2` `3` | GRAVITY / WAVES / LENS modes |
| WAVES + hold & release | Charge and release a large shockwave |
| LENS | Einstein-ring gravitational lensing (screen-space + particle lensing) |
| `SPACE` | Freeze time (camera still reacts to the pointer) |
| `R` | Reset the world |
| `C` | Artifact capture (clean PNG, `VANTA_001_a7f3.png`) |
| `H` | Collapse / expand the control panel |
| Wheel / pinch | Zoom |

## Architecture

```text
app/                    layout, page (server) -> components/ClientApp (dynamic, ssr:false)
components/vanta/
  VantaApp.tsx          WebGL check, keyboard, visibility, DPR budget, HUD + scene
  VantaScene.tsx        <Canvas> composition
  InputSurface.tsx      pointer/touch/wheel/pinch -> engine (no React state)
  ForceField.tsx        drives the engine clock, syncs palette/seed/reset
  CameraRig.tsx         eased zoom, parallax, capture drift
  CentralArtifact.tsx   displaced icosphere + accretion ring
  MatterField.tsx       single THREE.Points, buffers allocated once, drawRange for count
  Backdrop.tsx          full-screen deep-space shader
  Postprocessing.tsx    space warp -> bloom -> ACES -> grade -> vignette -> grain
  SpaceWarpEffect.ts    custom postprocessing Effect (lensing + shock refraction)
  ArtifactCapture.tsx   final frame subscriber: manual render + PNG readback
  PerformanceMonitor.tsx adaptive DPR / particle cap, FPS meter
  Hud.tsx, ControlPanel.tsx, ui.tsx, WebGLFallback.tsx
shaders/                noise, shared field model, artifact, particles, ring, background, warp
lib/
  engine.ts             mutable runtime: input, pointer kinematics, impulses, eased uniforms
  pointer-history.ts    64-sample ring buffer mirrored into a float DataTexture
  uniforms.ts           uniform objects shared by every material
  store.ts              Zustand + persist (localStorage)
  palettes.ts, presets.ts, capture.ts, performance.ts
types/vanta.ts
```

High-frequency data (pointer, velocities, field state) lives in `lib/engine.ts` and is written directly
into shared uniform objects; React only re-renders on settings changes.

### Pointer history

Each sample stores world position, birth time, strength, speed, impulse type (move / gravity / shock)
and a radius multiplier. Shaders loop over the texture and integrate travelling ripples, lingering
gravity wells and expanding shock shells, so traces propagate and decay instead of vanishing.

## Persistence

Saved in `localStorage` (`vanta-reality-engine`): mode, palette, per-mode parameters, particle count,
post-processing and performance settings, world seed and the last 16 artifacts (seed + full config).
Restore a configuration by typing an artifact seed in **ARTIFACT ARCHIVE** or clicking an entry.
**FACTORY RESET** restores defaults (archived artifacts are kept).

## Performance

- Pixel ratio capped (default 1.75 desktop / 1.5 mobile, user adjustable).
- Adaptive quality lowers DPR first, then particle count; climbs back when there is headroom.
- 24k particles on desktop, 6k–12k on mobile / low-end devices.
- Bloom, grain, space warp or the whole post chain can be disabled.
- Rendering stops while the tab is hidden.

## Deploy to Vercel

1. Push this folder to a Git repository.
2. Import it at vercel.com/new — the framework preset is detected as **Next.js**, no env vars needed.
3. Or with the CLI: `npx vercel` then `npx vercel --prod`.

The page is fully static (prerendered shell + client-side WebGL), so any static-capable Next.js host works.
