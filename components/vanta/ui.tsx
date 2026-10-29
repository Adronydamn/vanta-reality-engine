"use client";

import type { CSSProperties, ReactNode } from "react";

export function Section({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-white/[0.07] px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="hud-label">{label}</h3>
        {aside && <span className="hud-label text-white/35">{aside}</span>}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}

export function Slider({ label, value, min, max, step, onChange, format = (v) => v.toFixed(2) }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="hud-label text-white/55">{label}</span>
        <span className="hud-num text-[11px] text-white/85">{format(value)}</span>
      </div>
      <input
        type="range"
        className="hud-range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--fill": `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between py-0.5"
    >
      <span className={`hud-label transition-colors ${checked ? "text-white/80" : "text-white/35"}`}>{label}</span>
      <span
        className={`relative h-[9px] w-[22px] rounded-full border transition-colors ${
          checked ? "border-[var(--accent)] bg-[var(--accent)]/20" : "border-white/20 bg-transparent"
        }`}
      >
        <span
          className={`absolute top-1/2 h-[5px] w-[5px] -translate-y-1/2 rounded-full transition-all ${
            checked ? "left-[13px] bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]" : "left-[2px] bg-white/40"
          }`}
        />
      </span>
    </button>
  );
}

export function HudButton({
  children,
  onClick,
  active = false,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`hud-label border px-2 py-1.5 transition-all duration-300 ${
        active
          ? "border-[var(--accent)]/70 bg-[var(--accent)]/10 text-white shadow-[inset_0_0_12px_-4px_var(--accent)]"
          : "border-white/10 text-white/50 hover:border-white/30 hover:text-white/85"
      } ${className}`}
    >
      {children}
    </button>
  );
}
