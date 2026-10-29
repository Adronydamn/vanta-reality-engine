"use client";

import { useTelemetryStore, useVantaStore } from "@/lib/store";
import { MODE_DESCRIPTIONS, MODE_LABELS } from "@/lib/presets";
import { ControlPanel } from "./ControlPanel";

function StatusIndicator() {
  const paused = useVantaStore((s) => s.paused);
  return (
    <div className="hud-panel flex items-center gap-2 px-3 py-1.5">
      <span
        className={`h-1.5 w-1.5 rounded-full ${paused ? "bg-amber-300/80" : "animate-pulse bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"}`}
      />
      <span className="hud-label text-white/75">{paused ? "PAUSED" : "LIVE"}</span>
    </div>
  );
}

function FpsReadout() {
  const fps = useTelemetryStore((s) => s.fps);
  const count = useVantaStore((s) => Math.min(s.particleCount, s.autoParticleCap));
  const level = fps >= 55 ? 4 : fps >= 45 ? 3 : fps >= 30 ? 2 : 1;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`w-[3px] ${i <= level ? "bg-[var(--accent)]" : "bg-white/15"}`} style={{ height: 3 + i * 2 }} />
        ))}
      </div>
      <span className="hud-num text-[10px] text-white/70">{String(fps).padStart(3, "0")} FPS</span>
      <span className="hud-num hidden text-[10px] text-white/35 sm:inline">{count.toLocaleString("en-US")} PTS</span>
    </div>
  );
}

const HINTS: Array<[string, string]> = [
  ["MOVE", "BEND"],
  ["HOLD", "GRAVITY"],
  ["SPACE", "FREEZE"],
  ["R", "RESET"],
  ["C", "CAPTURE"],
];

function Toast() {
  const toast = useVantaStore((s) => s.toast);
  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 transition-all duration-500 sm:top-20 ${
        toast ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      <div className="hud-panel hud-label whitespace-nowrap px-4 py-2 text-white/80">{toast ?? ""}</div>
    </div>
  );
}

export function Hud() {
  const capturing = useVantaStore((s) => s.capturing);
  const mode = useVantaStore((s) => s.mode);

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out ${
          capturing ? "opacity-0 [&_*]:!pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Top bar */}
        <header className="absolute inset-x-3 top-3 flex items-start justify-between sm:inset-x-5 sm:top-5">
          <div className="pointer-events-auto flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[15px] font-light tracking-[0.55em] text-white/90">VANTA</span>
              <span className="hud-label mt-1 text-white/40">REALITY ENGINE / 001</span>
            </div>
            <span className="hidden h-7 w-px bg-white/10 sm:block" />
            <span className="hud-label hidden text-white/30 md:block">VISUAL PHYSICS LABORATORY</span>
          </div>
          <div className="pointer-events-auto">
            <StatusIndicator />
          </div>
        </header>

        <ControlPanel />

        {/* Bottom bar */}
        <footer className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-4 sm:inset-x-5 sm:bottom-5">
          <div className="hud-panel pointer-events-auto flex items-center gap-4 px-3 py-2">
            <div className="flex flex-col">
              <span className="hud-label text-white/35">MODE</span>
              <span className="hud-label mt-0.5 text-white/85">{MODE_LABELS[mode]}</span>
            </div>
            <span className="hud-label hidden text-white/30 lg:block">{MODE_DESCRIPTIONS[mode]}</span>
            <span className="h-6 w-px bg-white/10" />
            <FpsReadout />
          </div>
          <div className="hud-panel hidden items-center gap-4 px-3 py-2 md:flex">
            {HINTS.map(([key, action]) => (
              <span key={key} className="flex items-center gap-1.5">
                <kbd className="hud-num border border-white/15 px-1.5 py-px text-[9px] text-white/70">{key}</kbd>
                <span className="hud-label text-white/35">{action}</span>
              </span>
            ))}
          </div>
        </footer>

        {/* Corner reticles */}
        <div className="hud-corner left-3 top-[72px] border-l border-t sm:left-5" />
        <div className="hud-corner bottom-[60px] left-3 border-b border-l sm:left-5" />
      </div>
      <Toast />
    </>
  );
}
