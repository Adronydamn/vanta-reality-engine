"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { getEngine } from "@/lib/engine";

/**
 * Orbiting camera: eased zoom, subtle pointer parallax (also while time is frozen)
 * and a slow cinematic drift during artifact capture.
 */
export function CameraRig() {
  const engine = getEngine();
  const state = useRef({ zoom: engine.zoomTarget, az: 0, el: 0.06, px: 0, py: 0 });

  useFrame(({ camera, size }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const s = state.current;
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);

    engine.captureDrift += ((engine.captureActive ? 1 : 0) - engine.captureDrift) * ease(1.6);
    s.zoom += (engine.zoomTarget - s.zoom) * ease(4);

    // Parallax is frozen during capture so the composition stays stable.
    if (!engine.captureActive) {
      s.px += (engine.input.ndc.x - s.px) * ease(2.2);
      s.py += (engine.input.ndc.y - s.py) * ease(2.2);
    }

    const t = engine.simTime;
    const targetAz = s.px * 0.2 + Math.sin(t * 0.06) * 0.1 + engine.captureDrift * 0.14;
    const targetEl = 0.06 + s.py * 0.1 + Math.sin(t * 0.045) * 0.04 - engine.captureDrift * 0.03;
    s.az += (targetAz - s.az) * ease(2.5);
    s.el += (targetEl - s.el) * ease(2.5);

    // Vertical FOV: pull back on narrow (portrait) screens so the artifact keeps its framing.
    const aspect = size.width / Math.max(size.height, 1);
    const portrait = Math.max(1, 0.8 / aspect);
    const r = s.zoom * portrait * (1 - engine.captureDrift * 0.04);
    camera.position.set(Math.sin(s.az) * Math.cos(s.el) * r, Math.sin(s.el) * r, Math.cos(s.az) * Math.cos(s.el) * r);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  }, -2);

  return null;
}
