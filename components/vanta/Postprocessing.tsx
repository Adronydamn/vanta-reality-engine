"use client";

import { useMemo, useRef, type JSX } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  Noise,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type BloomEffect } from "postprocessing";
import { getEngine } from "@/lib/engine";
import { useVantaStore } from "@/lib/store";
import { SpaceWarpEffect } from "./SpaceWarpEffect";

/**
 * Cinematic post chain: space warp -> bloom -> ACES tone mapping -> grade -> vignette -> grain.
 * Toggling an effect remounts the composer with a new key so disabled effects cost nothing.
 */
export function Postprocessing() {
  const engine = getEngine();
  const post = useVantaStore((s) => s.post);
  const mobile = useVantaStore((s) => s.device.mobile);
  const bloomRef = useRef<BloomEffect>(null);
  const warp = useMemo(() => new SpaceWarpEffect(engine), [engine]);

  useFrame(() => {
    const bloom = bloomRef.current;
    if (bloom) bloom.intensity = engine.bloomLevel * useVantaStore.getState().post.bloomIntensity * 1.1;
  });

  const effects: JSX.Element[] = [];
  if (post.warp) effects.push(<primitive key="warp" object={warp} />);
  if (post.bloom) {
    effects.push(
      <Bloom
        key="bloom"
        ref={bloomRef}
        mipmapBlur
        intensity={1}
        luminanceThreshold={0.42}
        luminanceSmoothing={0.35}
        radius={0.78}
        levels={mobile ? 6 : 8}
      />,
    );
  }
  effects.push(<ToneMapping key="tone" mode={ToneMappingMode.ACES_FILMIC} />);
  effects.push(<HueSaturation key="hue" saturation={0.08} />);
  effects.push(<BrightnessContrast key="bc" brightness={0.0} contrast={0.06} />);
  effects.push(<Vignette key="vignette" offset={0.28} darkness={0.78} eskil={false} />);
  if (post.grain) effects.push(<Noise key="grain" premultiply={false} blendFunction={BlendFunction.OVERLAY} opacity={0.22} />);

  return (
    <EffectComposer
      key={`${post.warp}-${post.bloom}-${post.grain}`}
      multisampling={mobile ? 0 : 4}
      enableNormalPass={false}
    >
      {effects}
    </EffectComposer>
  );
}
