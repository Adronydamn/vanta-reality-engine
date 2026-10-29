export function WebGLFallback({ reason }: { reason: "none" | "webgl1" }) {
  return (
    <main className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-[#020309] px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(124,92,255,0.14),transparent_55%)]" />
      <div className="relative h-40 w-40">
        <div className="absolute inset-0 rounded-full border border-white/10" />
        <div className="absolute inset-6 rounded-full bg-[radial-gradient(circle_at_40%_35%,#1b2a6b,#03040c_70%)] shadow-[0_0_60px_-10px_#7c5cff]" />
        <div className="absolute -inset-6 rotate-[-14deg] scale-y-[0.28] rounded-full border border-[#7c5cff]/40" />
      </div>
      <div className="absolute bottom-[18%] max-w-md text-center">
        <p className="text-[15px] font-light tracking-[0.55em] text-white/90">VANTA</p>
        <p className="hud-label mt-2 text-white/40">REALITY ENGINE / 001 — OFFLINE</p>
        <p className="mt-6 text-[13px] leading-relaxed text-white/55">
          {reason === "none"
            ? "This instrument renders a live GPU simulation, but WebGL is unavailable in this browser. Enable hardware acceleration or open the page in a current version of Chrome, Edge, Firefox or Safari."
            : "This instrument requires WebGL 2 for its field shaders. Your browser only exposes WebGL 1 — please update the browser or enable hardware acceleration."}
        </p>
      </div>
    </main>
  );
}
