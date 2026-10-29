"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useVantaStore } from "@/lib/store";
import { PALETTES } from "@/lib/palettes";
import { detectWebGL, type WebGLSupport } from "@/lib/performance";
import { runArtifactCapture } from "@/lib/capture";
import { VantaScene } from "./VantaScene";
import { InputSurface } from "./InputSurface";
import { Hud } from "./Hud";
import { WebGLFallback } from "./WebGLFallback";

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useVantaStore.getState();
      switch (e.code) {
        case "Space":
          e.preventDefault();
          s.togglePause();
          break;
        case "KeyR":
          s.resetWorld();
          break;
        case "KeyC":
          void runArtifactCapture();
          break;
        case "KeyH":
          s.setPanelOpen(!s.panelOpen);
          break;
        case "Digit1":
          s.setMode("gravity");
          break;
        case "Digit2":
          s.setMode("shockwave");
          break;
        case "Digit3":
          s.setMode("lens");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function useVisibility() {
  useEffect(() => {
    const update = () => useVantaStore.getState().setTabHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
}

/** Keeps the render resolution inside the user's pixel-ratio budget. */
function useResolutionBudget() {
  const adaptive = useVantaStore((s) => s.performance.adaptive);
  const maxDpr = useVantaStore((s) => s.performance.maxDpr);
  useEffect(() => {
    const s = useVantaStore.getState();
    const native = Math.min(window.devicePixelRatio || 1, maxDpr);
    if (!adaptive) {
      s.setDpr(native);
      s.setAutoParticleCap(s.device.maxParticles);
    } else if (s.dpr > native || s.dpr === 1) {
      s.setDpr(native);
    }
  }, [adaptive, maxDpr]);
}

export default function VantaApp() {
  const [support, setSupport] = useState<WebGLSupport | null>(null);
  const palette = useVantaStore((s) => s.palette);

  useEffect(() => setSupport(detectWebGL()), []);
  useKeyboard();
  useVisibility();
  useResolutionBudget();

  if (support === null) return <main className="h-dvh w-full bg-black" />;
  if (support !== "webgl2") return <WebGLFallback reason={support} />;

  const p = PALETTES[palette];
  return (
    <main
      className="relative h-dvh w-full overflow-hidden bg-black text-white"
      style={{ "--accent": p.rim, "--accent-hot": p.hot } as CSSProperties}
    >
      <InputSurface>
        <VantaScene />
      </InputSurface>
      <Hud />
    </main>
  );
}
