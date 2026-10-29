"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { getEngine } from "@/lib/engine";
import { useVantaStore } from "@/lib/store";
import { PALETTES } from "@/lib/palettes";
import { seedToUnit } from "@/lib/presets";

/**
 * Drives the force-field simulation clock and keeps the engine in sync with user settings.
 * Runs before every other frame subscriber so all shaders read the same field state.
 */
export function ForceField() {
  const engine = getEngine();
  const palette = useVantaStore((s) => s.palette);
  const worldSeed = useVantaStore((s) => s.worldSeed);
  const resetNonce = useVantaStore((s) => s.resetNonce);
  const firstPalette = useRef(true);
  const lastReset = useRef(resetNonce);

  useEffect(() => {
    engine.setPalette(PALETTES[palette], firstPalette.current);
    firstPalette.current = false;
  }, [engine, palette]);

  useEffect(() => {
    engine.setSeed(seedToUnit(worldSeed));
  }, [engine, worldSeed]);

  useEffect(() => {
    if (lastReset.current === resetNonce) return;
    lastReset.current = resetNonce;
    engine.reset();
  }, [engine, resetNonce]);

  useFrame((state, delta) => {
    const s = useVantaStore.getState();
    engine.update(Math.min(delta, 1 / 20), state.camera, {
      mode: s.mode,
      params: s.modeParams[s.mode],
      paused: s.paused,
    });
  }, -1);

  return null;
}
