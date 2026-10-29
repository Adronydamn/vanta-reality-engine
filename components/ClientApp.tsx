"use client";

import dynamic from "next/dynamic";

/** The whole instrument is client-only: WebGL, localStorage and device probing never run on the server. */
const VantaApp = dynamic(() => import("./vanta/VantaApp"), {
  ssr: false,
  loading: () => (
    <main className="flex h-dvh w-full items-center justify-center bg-black">
      <span className="hud-label animate-pulse text-white/40">INITIALIZING REALITY ENGINE</span>
    </main>
  ),
});

export function ClientApp() {
  return <VantaApp />;
}
