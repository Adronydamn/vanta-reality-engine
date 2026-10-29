"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getEngine } from "@/lib/engine";
import { backgroundFragmentShader, backgroundVertexShader } from "@/shaders/background.glsl";

/** Full-screen deep-space gradient drawn behind everything (single triangle, no depth). */
export function Backdrop() {
  const engine = getEngine();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    return g;
  }, []);

  const material = useMemo(() => {
    const u = engine.uniforms;
    return new THREE.ShaderMaterial({
      vertexShader: backgroundVertexShader,
      fragmentShader: backgroundFragmentShader,
      uniforms: {
        uTime: u.uTime,
        uSeed: u.uSeed,
        uColBg: u.uColBg,
        uColHaze: u.uColHaze,
        uColRim: u.uColRim,
        uAspect: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });
  }, [engine]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ size }) => {
    material.uniforms.uAspect.value = size.width / Math.max(size.height, 1);
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-1000} />;
}
