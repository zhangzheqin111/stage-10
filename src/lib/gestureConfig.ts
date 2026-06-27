export type GestureConfig = {
  heightDisplacementGain: number;
  heightVelocityGain: number;
  heightMaxStep: number;
  heightReferenceTopY: number;
  heightReferenceRange: number;

  horizontalVelocityGain: number;
  horizontalOffsetGain: number;
  palmRollGain: number;
  fingertipSwingGain: number;
  edgeRollWeightBoost: number;
  edgeSwingWeightBoost: number;
  edgeWindAmplify: number;
  windMaxStep: number;

  openSpreadThreshold: number;
  openDebounceMs: number;
  openTransitionKeep: number;

  pinchTriggerRatio: number;
  pinchReleaseRatio: number;
  pinchCooldownMs: number;

  twoHandDirectionTolerance: number;
  twoHandHeightTolerance: number;
  fusionStreakFrames: number;

  palmSmoothKeep: number;

  movePixelThreshold: number;
  moveYRatio: number;
  moveHeightDeltaThreshold: number;
  moveWindDeltaThreshold: number;

  lostHandHoldMs: number;
};

export const defaultGestureConfig: GestureConfig = {
  heightDisplacementGain: 185,
  heightVelocityGain: 170,
  heightMaxStep: 22,
  heightReferenceTopY: 0.78,
  heightReferenceRange: 0.54,

  horizontalVelocityGain: 760,
  horizontalOffsetGain: 12,
  palmRollGain: 74,
  fingertipSwingGain: 52,
  edgeRollWeightBoost: 0.05,
  edgeSwingWeightBoost: 0.08,
  edgeWindAmplify: 0.16,
  windMaxStep: 24,

  openSpreadThreshold: 1.28,
  openDebounceMs: 200,
  openTransitionKeep: 0.7,

  pinchTriggerRatio: 0.42,
  pinchReleaseRatio: 0.58,
  pinchCooldownMs: 580,

  twoHandDirectionTolerance: 24,
  twoHandHeightTolerance: 34,
  fusionStreakFrames: 2,

  palmSmoothKeep: 0.38,

  movePixelThreshold: 0.009,
  moveYRatio: 0.78,
  moveHeightDeltaThreshold: 8,
  moveWindDeltaThreshold: 9,

  lostHandHoldMs: 250
};

const STORAGE_KEY = "bloombeat-gesture-config";

export function loadGestureConfig(): GestureConfig {
  if (typeof window === "undefined") {
    return defaultGestureConfig;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultGestureConfig;
    }
    const parsed = JSON.parse(raw) as Partial<GestureConfig>;
    return { ...defaultGestureConfig, ...parsed };
  } catch {
    return defaultGestureConfig;
  }
}

export function saveGestureConfig(partial: Partial<GestureConfig>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const current = loadGestureConfig();
    const next = { ...current, ...partial };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be restricted in embedded browsers; keep runtime tuning in memory.
  }
}

export function resetGestureConfig() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore restricted storage.
  }
}

export type DebugSample = {
  time: number;
  hands: number;
  fps: number;
  pinchRatio: number;
  openSpread: number;
  height: number;
  wind: number;
  fusion: "fuse" | "primary";
};

const MAX_SAMPLES = 30;

export function createDebugBuffer() {
  const samples: DebugSample[] = [];
  let lastFrameTime = 0;

  return {
    push(sample: DebugSample) {
      samples.push(sample);
      if (samples.length > MAX_SAMPLES) {
        samples.shift();
      }
      lastFrameTime = sample.time;
    },
    snapshot() {
      return {
        samples: samples.slice(),
        lastFrameTime
      };
    },
    clear() {
      samples.length = 0;
    }
  };
}
