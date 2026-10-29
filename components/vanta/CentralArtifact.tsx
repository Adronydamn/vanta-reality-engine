"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getEngine } from "@/lib/engine";
import { useVantaStore } from "@/lib/store";
import { artifactVertexShader } from "@/shaders/artifact.vert.glsl";
import { artifactFragmentShader } from "@/shaders/artifact.frag.glsl";
import { ringFragmentShader, ringVertexShader } from "@/shaders/ring.glsl";

export const BODY_RADIUS = 1.05;
export const DISK_TILT = 0.38;
const RING_INNER = 1.42;
const RING_OUTER = 3.7;

/** Indexed icosphere: shared vertices keep the displaced surface watertight and halve vertex work. */
function createBodyGeometry(detail: number) {
  const ico = new THREE.IcosahedronGeometry(1, detail);
  ico.deleteAttribute("normal");
  ico.deleteAttribute("uv");
  const merged = mergeVertices(ico, 1e-5);
  ico.dispose();
  merged.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);
  return merged;
}

export function CentralArtifact() {
  const engine = getEngine();
  const mobile = useVantaStore((s) => s.device.mobile);
  const body = useRef<THREE.Mesh>(null);

  const bodyGeometry = useMemo(() => createBodyGeometry(mobile ? 36 : 60), [mobile]);
  const ringGeometry = useMemo(() => {
    const g = new THREE.RingGeometry(RING_INNER, RING_OUTER, mobile ? 160 : 288, mobile ? 18 : 32);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
    return g;
  }, [mobile]);

  const bodyMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: artifactVertexShader,
        fragmentShader: artifactFragmentShader,
        uniforms: { ...engine.uniforms, uBodyRadius: { value: BODY_RADIUS } },
      }),
    [engine],
  );

  const ringMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ringVertexShader,
        fragmentShader: ringFragmentShader,
        uniforms: { ...engine.uniforms, uInner: { value: RING_INNER }, uOuter: { value: RING_OUTER } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [engine],
  );

  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry]);
  useEffect(() => () => ringGeometry.dispose(), [ringGeometry]);
  useEffect(
    () => () => {
      bodyMaterial.dispose();
      ringMaterial.dispose();
    },
    [bodyMaterial, ringMaterial],
  );

  useFrame((_, delta) => {
    if (useVantaStore.getState().paused || !body.current) return;
    const dt = Math.min(delta, 1 / 20);
    const t = engine.simTime;
    body.current.rotation.y += dt * 0.11;
    body.current.rotation.x = Math.sin(t * 0.09) * 0.18;
    body.current.rotation.z = Math.cos(t * 0.07) * 0.08;
  });

  return (
    <>
      <mesh ref={body} geometry={bodyGeometry} material={bodyMaterial} />
      <mesh geometry={ringGeometry} material={ringMaterial} rotation={[-Math.PI / 2 + DISK_TILT, 0, 0]} renderOrder={2} />
    </>
  );
}
