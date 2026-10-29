"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerformanceMonitor as DreiPerformanceMonitor } from "@react-three/drei";
import { FpsMeter } from "@/lib/performance";
import { useTelemetryStore, useVantaStore } from "@/lib/store";

const MIN_DPR = 0.75;
const MIN_AUTO_PARTICLES = 4000;

/**
 * Adaptive quality: lowers resolution first, then particle count when FPS drops,
 * and climbs back when there is headroom. Publishes FPS to the HUD twice a second.
 */
export function AdaptivePerformance() {
  const meter = useRef(new FpsMeter());

  useFrame((_, delta) => {
    if (meter.current.tick(delta)) useTelemetryStore.getState().setFps(Math.round(meter.current.fps));
  });

  const decline = () => {
    const s = useVantaStore.getState();
    if (!s.performance.adaptive || s.capturing) return;
    if (s.dpr > 1) s.setDpr(Math.max(1, s.dpr - 0.25));
    else if (s.autoParticleCap > MIN_AUTO_PARTICLES) s.setAutoParticleCap(Math.max(MIN_AUTO_PARTICLES, s.autoParticleCap * 0.78));
    else if (s.dpr > MIN_DPR) s.setDpr(Math.max(MIN_DPR, s.dpr - 0.125));
  };

  const incline = () => {
    const s = useVantaStore.getState();
    if (!s.performance.adaptive) return;
    if (s.dpr < 1) s.setDpr(Math.min(1, s.dpr + 0.125));
    else if (s.autoParticleCap < s.device.maxParticles) s.setAutoParticleCap(Math.min(s.device.maxParticles, s.autoParticleCap * 1.2));
    else if (s.dpr < s.performance.maxDpr) s.setDpr(Math.min(s.performance.maxDpr, s.dpr + 0.25));
  };

  return <DreiPerformanceMonitor bounds={() => [48, 58]} flipflops={8} onDecline={decline} onIncline={incline} />;
}
