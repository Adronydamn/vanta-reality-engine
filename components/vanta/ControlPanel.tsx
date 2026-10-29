"use client";

import { useState } from "react";
import { useVantaStore } from "@/lib/store";
import { PALETTES, PALETTE_IDS } from "@/lib/palettes";
import { MODE_DESCRIPTIONS, MODE_LABELS, PARTICLES_MIN } from "@/lib/presets";
import { artifactFileName, restoreFromSeed, runArtifactCapture } from "@/lib/capture";
import type { FieldMode } from "@/types/vanta";
import { HudButton, Section, Slider, Toggle } from "./ui";

const MODES: FieldMode[] = ["gravity", "shockwave", "lens"];

function ModeSection() {
  const mode = useVantaStore((s) => s.mode);
  const params = useVantaStore((s) => s.modeParams[s.mode]);
  const setMode = useVantaStore((s) => s.setMode);
  const setParam = useVantaStore((s) => s.setModeParam);

  return (
    <>
      <Section label="FIELD MODE" aside={MODE_DESCRIPTIONS[mode]}>
        <div className="grid grid-cols-3 gap-1.5">
          {MODES.map((m) => (
            <HudButton key={m} active={m === mode} onClick={() => setMode(m)}>
              {MODE_LABELS[m]}
            </HudButton>
          ))}
        </div>
      </Section>
      <Section label="FIELD PARAMETERS" aside={MODE_LABELS[mode]}>
        <Slider label="FIELD STRENGTH" value={params.strength} min={0} max={2} step={0.01} onChange={(v) => setParam("strength", v)} />
        <Slider label="RADIUS" value={params.radius} min={0.6} max={3} step={0.01} onChange={(v) => setParam("radius", v)} />
        <Slider label="DECAY" value={params.decay} min={0.3} max={2.5} step={0.01} onChange={(v) => setParam("decay", v)} />
        <Slider label="DEFORMATION" value={params.deform} min={0} max={2} step={0.01} onChange={(v) => setParam("deform", v)} />
      </Section>
    </>
  );
}

function MatterSection() {
  const particleCount = useVantaStore((s) => s.particleCount);
  const cap = useVantaStore((s) => s.autoParticleCap);
  const max = useVantaStore((s) => s.device.maxParticles);
  const setParticleCount = useVantaStore((s) => s.setParticleCount);
  const effective = Math.min(particleCount, cap);

  return (
    <Section label="MATTER" aside={effective < particleCount ? "AUTO-CAPPED" : "NOMINAL"}>
      <Slider
        label="PARTICLES"
        value={particleCount}
        min={PARTICLES_MIN}
        max={max}
        step={500}
        onChange={setParticleCount}
        format={(v) => `${effective.toLocaleString("en-US")} / ${Math.round(v).toLocaleString("en-US")}`}
      />
    </Section>
  );
}

function PaletteSection() {
  const palette = useVantaStore((s) => s.palette);
  const setPalette = useVantaStore((s) => s.setPalette);
  return (
    <Section label="SPECTRUM" aside={PALETTES[palette].label}>
      <div className="grid grid-cols-4 gap-1.5">
        {PALETTE_IDS.map((id) => {
          const p = PALETTES[id];
          const active = id === palette;
          return (
            <button
              key={id}
              type="button"
              title={p.label}
              onClick={() => setPalette(id)}
              className={`group flex flex-col items-center gap-1.5 border py-2 transition-all duration-300 ${
                active ? "border-white/40" : "border-white/[0.08] hover:border-white/25"
              }`}
            >
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${p.hot}, ${p.rim} 45%, ${p.deep} 100%)`,
                  boxShadow: active ? `0 0 10px ${p.rim}` : "none",
                }}
              />
              <span className={`hud-label text-[8px] ${active ? "text-white/85" : "text-white/40"}`}>{p.label}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function RenderSection() {
  const post = useVantaStore((s) => s.post);
  const perf = useVantaStore((s) => s.performance);
  const dpr = useVantaStore((s) => s.dpr);
  const setPost = useVantaStore((s) => s.setPost);
  const setPerformance = useVantaStore((s) => s.setPerformance);

  return (
    <Section label="RENDER PIPELINE" aside={`DPR ${dpr.toFixed(2)}`}>
      <Toggle label="POST-PROCESSING" checked={post.enabled} onChange={(v) => setPost({ enabled: v })} />
      <div className={`space-y-2 transition-opacity ${post.enabled ? "opacity-100" : "pointer-events-none opacity-30"}`}>
        <Toggle label="BLOOM" checked={post.bloom} onChange={(v) => setPost({ bloom: v })} />
        <Toggle label="FILM GRAIN" checked={post.grain} onChange={(v) => setPost({ grain: v })} />
        <Toggle label="SPACE WARP" checked={post.warp} onChange={(v) => setPost({ warp: v })} />
        {post.bloom && (
          <Slider label="BLOOM INTENSITY" value={post.bloomIntensity} min={0} max={2} step={0.01} onChange={(v) => setPost({ bloomIntensity: v })} />
        )}
      </div>
      <Toggle label="ADAPTIVE QUALITY" checked={perf.adaptive} onChange={(v) => setPerformance({ adaptive: v })} />
      <Slider label="MAX PIXEL RATIO" value={perf.maxDpr} min={1} max={2} step={0.25} onChange={(v) => setPerformance({ maxDpr: v })} />
    </Section>
  );
}

function ArtifactSection() {
  const artifacts = useVantaStore((s) => s.artifacts);
  const worldSeed = useVantaStore((s) => s.worldSeed);
  const capturing = useVantaStore((s) => s.capturing);
  const [seed, setSeed] = useState("");

  return (
    <Section label="ARTIFACT ARCHIVE" aside={`WORLD ${worldSeed}`}>
      <HudButton active={capturing} className="w-full py-2" onClick={() => void runArtifactCapture()} title="Capture clean PNG [C]">
        ◉ ARTIFACT CAPTURE
      </HudButton>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (restoreFromSeed(seed)) setSeed("");
        }}
      >
        <input
          value={seed}
          onChange={(e) => setSeed(e.target.value.slice(0, 8))}
          placeholder="SEED · a7f3"
          spellCheck={false}
          className="hud-num min-w-0 flex-1 border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/85 outline-none placeholder:text-white/25 focus:border-white/30"
        />
        <button type="submit" className="hud-label border border-white/10 px-2 text-white/50 hover:border-white/30 hover:text-white/85">
          RESTORE
        </button>
      </form>
      {artifacts.length > 0 && (
        <ul className="max-h-28 space-y-px overflow-y-auto pr-1">
          {artifacts.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => restoreFromSeed(a.seed)}
                className="hud-num flex w-full items-center justify-between px-1.5 py-1 text-[10px] text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/85"
              >
                <span>{artifactFileName(a).replace(".png", "")}</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: PALETTES[a.config.palette]?.rim }} />
                  {MODE_LABELS[a.config.mode]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function ControlPanel() {
  const resetWorld = useVantaStore((s) => s.resetWorld);
  const factoryReset = useVantaStore((s) => s.factoryReset);
  const open = useVantaStore((s) => s.panelOpen);
  const setOpen = useVantaStore((s) => s.setPanelOpen);

  return (
    <aside className="pointer-events-auto absolute right-3 top-16 bottom-14 flex w-[288px] max-w-[calc(100vw-1.5rem)] flex-col items-end sm:right-5 sm:top-20 sm:bottom-16">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="hud-panel hud-label mb-2 flex items-center gap-2 px-3 py-1.5 text-white/60 hover:text-white"
      >
        <span className={`inline-block transition-transform duration-300 ${open ? "rotate-90" : ""}`}>▸</span>
        {open ? "COLLAPSE" : "FIELD CONTROL"}
        <kbd className="hud-num border border-white/15 px-1 text-[8px] text-white/40">H</kbd>
      </button>
      <div
        className={`hud-panel w-full overflow-hidden transition-all duration-500 ${
          open ? "min-h-0 flex-1 opacity-100" : "pointer-events-none h-0 flex-none opacity-0"
        }`}
      >
        <div className="h-full overflow-y-auto overscroll-contain">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="hud-label text-white/80">INTERACTIVE MATTER FIELD</span>
            <span className="hud-label flex items-center gap-1.5 text-white/40">
              <span className="h-1 w-1 rounded-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]" />
              GPU ACCELERATED
            </span>
          </div>
          <ModeSection />
          <MatterSection />
          <PaletteSection />
          <ArtifactSection />
          <RenderSection />
          <Section label="SYSTEM">
            <div className="grid grid-cols-2 gap-1.5">
              <HudButton onClick={resetWorld} title="Reset world [R]">
                RESET
              </HudButton>
              <HudButton
                onClick={() => {
                  if (window.confirm("Restore all settings to factory defaults? Archived artifacts are kept.")) factoryReset();
                }}
              >
                FACTORY RESET
              </HudButton>
            </div>
          </Section>
        </div>
      </div>
    </aside>
  );
}
