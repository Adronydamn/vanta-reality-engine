"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { getEngine } from "@/lib/engine";

/**
 * Captures mouse / touch / wheel input for the field and writes it straight into the engine
 * (no React state). Two-finger pinch zooms the camera.
 */
export function InputSurface({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const engine = getEngine();
    const input = engine.input;
    const touches = new Map<number, { x: number; y: number }>();
    let pinchStart = 0;
    let zoomStart = engine.zoomTarget;

    const setNdc = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      input.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    };
    const pinchDistance = () => {
      const [a, b] = [...touches.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const release = () => {
      if (input.down) {
        input.down = false;
        input.pendingUp = true;
      }
    };

    const onEnter = (e: PointerEvent) => {
      setNdc(e);
      input.jumped = true;
      input.inside = true;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        if (!touches.has(e.pointerId)) return;
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size >= 2) {
          if (pinchStart > 0) engine.setZoom(zoomStart * (pinchStart / Math.max(pinchDistance(), 1)));
          return;
        }
      }
      setNdc(e);
      input.inside = true;
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      el.setPointerCapture(e.pointerId);
      if (e.pointerType === "touch") {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size >= 2) {
          release();
          pinchStart = pinchDistance();
          zoomStart = engine.zoomTarget;
          return;
        }
        input.jumped = true;
      }
      setNdc(e);
      input.inside = true;
      input.down = true;
      input.pendingDown = true;
    };
    const onUp = (e: PointerEvent) => {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (e.pointerType === "touch") {
        touches.delete(e.pointerId);
        if (touches.size < 2) pinchStart = 0;
        if (touches.size === 0) {
          release();
          input.inside = false;
        }
        return;
      }
      release();
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || el.hasPointerCapture(e.pointerId)) return;
      release();
      input.inside = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      engine.zoomBy(Math.exp(Math.max(-120, Math.min(120, delta)) * 0.0011));
    };
    const onContext = (e: Event) => e.preventDefault();

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", onContext);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onContext);
    };
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 touch-none select-none cursor-crosshair">
      {children}
    </div>
  );
}
