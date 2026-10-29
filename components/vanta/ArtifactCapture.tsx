"use client";

import { useFrame } from "@react-three/fiber";
import { getEngine } from "@/lib/engine";
import { useVantaStore } from "@/lib/store";

/**
 * Final frame subscriber. Renders the scene itself when post-processing is disabled and,
 * when an artifact capture is pending, reads the canvas back immediately after the render
 * call — the drawing buffer is still intact, so preserveDrawingBuffer is not needed.
 */
export function ArtifactCapture() {
  const engine = getEngine();

  useFrame(({ gl, scene, camera }) => {
    if (!useVantaStore.getState().post.enabled) gl.render(scene, camera);
    if (engine.captureRequested && engine.onCaptured) {
      engine.captureRequested = false;
      engine.onCaptured(gl.domElement.toDataURL("image/png"));
    }
  }, 2);

  return null;
}
