"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useVantaStore } from "@/lib/store";
import { CAMERA_DISTANCE_DEFAULT } from "@/lib/presets";
import { Backdrop } from "./Backdrop";
import { CameraRig } from "./CameraRig";
import { ForceField } from "./ForceField";
import { CentralArtifact } from "./CentralArtifact";
import { MatterField } from "./MatterField";
import { Postprocessing } from "./Postprocessing";
import { ArtifactCapture } from "./ArtifactCapture";
import { AdaptivePerformance } from "./PerformanceMonitor";

export function VantaScene() {
  const dpr = useVantaStore((s) => s.dpr);
  const tabHidden = useVantaStore((s) => s.tabHidden);
  const postEnabled = useVantaStore((s) => s.post.enabled);

  return (
    <Canvas
      dpr={dpr}
      frameloop={tabHidden ? "never" : "always"}
      camera={{ fov: 40, near: 0.1, far: 100, position: [0, 0, CAMERA_DISTANCE_DEFAULT] }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      onCreated={({ gl }) => gl.setClearColor("#000000", 1)}
    >
      <CameraRig />
      <ForceField />
      <Backdrop />
      <group rotation={[0, 0, 0.16]}>
        <CentralArtifact />
        <MatterField />
      </group>
      {postEnabled && <Postprocessing />}
      <ArtifactCapture />
      <AdaptivePerformance />
    </Canvas>
  );
}
