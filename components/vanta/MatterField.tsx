"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getEngine } from "@/lib/engine";
import { useVantaStore } from "@/lib/store";
import { particlesVertexShader } from "@/shaders/particles.vert.glsl";
import { particlesFragmentShader } from "@/shaders/particles.frag.glsl";
import { DISK_TILT } from "./CentralArtifact";

function gaussian() {
  const u = Math.random() || 1e-6;
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Allocates the particle buffers once for the device maximum. Changing the particle count only
 * moves the draw range, so buffers are never rebuilt at runtime.
 */
function createMatterGeometry(capacity: number) {
  const orbit = new Float32Array(capacity * 3);
  const data = new Float32Array(capacity * 4);
  for (let i = 0; i < capacity; i++) {
    const disk = Math.random() < 0.64;
    const o = i * 3;
    const d = i * 4;
    if (disk) {
      const radius = 1.7 + Math.pow(Math.random(), 1.7) * 3.9;
      orbit[o] = radius;
      orbit[o + 1] = Math.random() * Math.PI * 2;
      orbit[o + 2] = gaussian() * (0.025 + radius * 0.018);
      data[d] = 0.8 + Math.random() * 0.4;
      data[d + 1] = Math.random() < 0.03 ? 1.8 + Math.random() : 0.45 + Math.random() * 0.8;
      data[d + 2] = 0;
    } else {
      orbit[o] = 2.1 + Math.pow(Math.random(), 0.85) * 7.0;
      orbit[o + 1] = Math.random() * Math.PI * 2;
      orbit[o + 2] = Math.random() * 2 - 1;
      data[d] = 0.15 + Math.random() * 0.35;
      data[d + 1] = Math.random() < 0.02 ? 1.6 + Math.random() : 0.35 + Math.random() * 0.75;
      data[d + 2] = 1;
    }
    data[d + 3] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(orbit, 3));
  g.setAttribute("aData", new THREE.BufferAttribute(data, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 14);
  return g;
}

export function MatterField() {
  const engine = getEngine();
  const capacity = useVantaStore((s) => s.device.maxParticles);
  const count = useVantaStore((s) => Math.min(s.particleCount, s.autoParticleCap));

  const geometry = useMemo(() => createMatterGeometry(capacity), [capacity]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particlesVertexShader,
        fragmentShader: particlesFragmentShader,
        uniforms: {
          ...engine.uniforms,
          uPixelRatio: { value: 1 },
          uSize: { value: 0.1 },
          uDiskTilt: { value: DISK_TILT },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [engine],
  );

  useEffect(() => {
    geometry.setDrawRange(0, count);
  }, [geometry, count]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ viewport }) => {
    material.uniforms.uPixelRatio.value = viewport.dpr;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={3} />;
}
