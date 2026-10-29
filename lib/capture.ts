import { getEngine } from "./engine";
import { currentConfig, useVantaStore } from "./store";
import type { ArtifactRecord } from "@/types/vanta";

const HUD_FADE_MS = 650;
const DRIFT_MS = 500;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function artifactFileName(record: Pick<ArtifactRecord, "number" | "seed">): string {
  return `VANTA_${String(record.number).padStart(3, "0")}_${record.seed}.png`;
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Ask the frame driver for the next rendered frame (read back right after the render call). */
function grabNextFrame(): Promise<string> {
  const engine = getEngine();
  return new Promise((resolve) => {
    engine.onCaptured = (url) => {
      engine.onCaptured = null;
      resolve(url);
    };
    engine.captureRequested = true;
  });
}

function flashToast(message: string) {
  const { showToast } = useVantaStore.getState();
  showToast(message);
  setTimeout(() => {
    if (useVantaStore.getState().toast === message) showToast(null);
  }, 3200);
}

/**
 * ARTIFACT CAPTURE: fade the HUD, let the camera settle into a short drift,
 * read back a clean frame, download it and store its seed + configuration.
 */
export async function runArtifactCapture(): Promise<ArtifactRecord | null> {
  const store = useVantaStore.getState();
  if (store.capturing) return null;
  const engine = getEngine();

  store.setCapturing(true);
  engine.captureActive = true;
  try {
    await wait(HUD_FADE_MS + DRIFT_MS);
    const dataUrl = await grabNextFrame();
    const record = useVantaStore.getState().addArtifact(currentConfig(engine.zoomTarget));
    const name = artifactFileName(record);
    downloadDataUrl(dataUrl, name);
    await wait(250);
    flashToast(`ARTIFACT ${name} ARCHIVED`);
    return record;
  } finally {
    engine.captureActive = false;
    useVantaStore.getState().setCapturing(false);
  }
}

/** Restore a configuration from an archived artifact seed; unknown valid seeds only reseed the world. */
export function restoreFromSeed(input: string): boolean {
  const seed = input.trim().toLowerCase();
  const store = useVantaStore.getState();
  const record = store.findArtifact(seed);
  if (record) {
    store.applyConfig(record.config);
    getEngine().setZoom(record.config.cameraDistance);
    flashToast(`CONFIG ${artifactFileName(record).replace(".png", "")} RESTORED`);
    return true;
  }
  if (/^[0-9a-f]{4}$/.test(seed)) {
    store.setWorldSeed(seed);
    flashToast(`WORLD SEED ${seed} APPLIED`);
    return true;
  }
  flashToast(`SEED ${seed || "----"} NOT FOUND`);
  return false;
}
