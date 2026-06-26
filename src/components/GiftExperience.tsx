"use client";

import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Category, HandLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { GiftDraft, GestureState, themes } from "@/lib/gift";
import { GestureDebugPanel, useGestureConfigState } from "./GestureDebugPanel";
import { createDebugBuffer, DebugSample } from "@/lib/gestureConfig";
import { GiftBackground } from "./GiftBackground";
import { SynthBgmButton } from "./SynthBgmButton";

const gestureLabel: Record<GestureState["type"], string> = {
  none: "待互动",
  vertical_wave: "上下摆动",
  horizontal_wave: "左右挥动",
  open_hand: "花朵开放",
  fist: "花朵闭合",
  clap: "切换颜色"
};

const extraFlowerColors = ["#f28caf", "#d9b7f4", "#a9cdf8", "#f6c85f", "#f25f5c", "#b8e0c4"];

const plants = [
  { x: -154, scale: 0.58, heightOffset: -62, delay: -0.5, sway: 3.0, wind: 0.82 },
  { x: -110, scale: 0.72, heightOffset: -38, delay: -1.1, sway: 3.8, wind: 1.08 },
  { x: -66, scale: 0.86, heightOffset: 4, delay: -0.2, sway: 2.9, wind: 0.94 },
  { x: -22, scale: 0.96, heightOffset: 34, delay: -1.6, sway: 4.1, wind: 1.18 },
  { x: 22, scale: 0.92, heightOffset: 20, delay: -0.9, sway: 3.3, wind: 0.9 },
  { x: 66, scale: 0.78, heightOffset: -18, delay: -1.3, sway: 3.9, wind: 1.24 },
  { x: 110, scale: 0.68, heightOffset: -46, delay: -0.7, sway: 3.1, wind: 1.02 },
  { x: 154, scale: 0.55, heightOffset: -70, delay: -1.8, sway: 3.6, wind: 0.76 }
];

const handLandmarkerModelUrl =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const visionWasmUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
type CameraStage = "idle" | "requesting" | "tracking-loading" | "tracking-ready" | "touch-fallback";
type CameraDiagnostics = {
  secureContext: boolean;
  apiSupported: boolean;
  permission: PermissionState | "unknown" | "unsupported";
  lastErrorName: string;
};

const cameraStageLabel: Record<CameraStage, string> = {
  idle: "未开启",
  requesting: "请求权限",
  "tracking-loading": "准备识别",
  "tracking-ready": "实时识别",
  "touch-fallback": "触摸兜底"
};

const cameraPermissionLabel: Record<CameraDiagnostics["permission"], string> = {
  granted: "已允许",
  denied: "已拒绝",
  prompt: "待询问",
  unknown: "未知",
  unsupported: "不可查询"
};

function calculateVolume(plantHeight: number, windPower: number) {
  const heightVolume = plantHeight * 0.72;
  const horizontalVolume = (windPower - 50) * 0.56;
  return Math.max(0, Math.min(100, Math.round(18 + heightVolume + horizontalVolume)));
}

function distanceBetween(first: NormalizedLandmark, second: NormalizedLandmark) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function averagePoint(points: NormalizedLandmark[]) {
  return points.reduce(
    (center, point) => ({
      x: center.x + point.x / points.length,
      y: center.y + point.y / points.length
    }),
    { x: 0, y: 0 }
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fingerSpreadScore(landmarks: NormalizedLandmark[], palmCenter: { x: number; y: number }) {
  const palmWidth = Math.max(0.001, distanceBetween(landmarks[5], landmarks[17]));
  const tips = [4, 8, 12, 16, 20];
  const averageDistance =
    tips.reduce((sum, index) => sum + Math.hypot(landmarks[index].x - palmCenter.x, landmarks[index].y - palmCenter.y), 0) /
    tips.length;
  return averageDistance / palmWidth;
}

function palmRollWind(landmarks: NormalizedLandmark[], rollGain: number) {
  const indexBase = landmarks[5];
  const pinkyBase = landmarks[17];
  const roll = (pinkyBase.y - indexBase.y) / Math.max(0.001, distanceBetween(indexBase, pinkyBase));
  return clamp(50 + roll * rollGain, 0, 100);
}

function normalizeRollWind(landmarks: NormalizedLandmark[], handedness: string | undefined, rollGain: number) {
  const rollWind = palmRollWind(landmarks, rollGain);
  return handedness === "Left" ? 100 - rollWind : rollWind;
}

function palmHeightScore(palmY: number, topY: number, range: number) {
  return clamp(((topY - palmY) / range) * 100, 0, 100);
}

function fingertipSwingScore(landmarks: NormalizedLandmark[], palmCenter: { x: number; y: number }, swingGain: number) {
  const palmWidth = Math.max(0.001, distanceBetween(landmarks[5], landmarks[17]));
  const fingertipCenter = averagePoint([
    { ...landmarks[8], x: 1 - landmarks[8].x },
    { ...landmarks[12], x: 1 - landmarks[12].x },
    { ...landmarks[16], x: 1 - landmarks[16].x },
    { ...landmarks[20], x: 1 - landmarks[20].x }
  ]);
  return clamp(50 + ((fingertipCenter.x - palmCenter.x) / palmWidth) * swingGain, 0, 100);
}

type TrackedHand = {
  hand: NormalizedLandmark[];
  handedness?: string;
  index: number;
};

function selectHands(hands: NormalizedLandmark[][], handednesses: Category[][] = []) {
  if (hands.length === 0) {
    return { primary: null, secondary: [] };
  }

  const classified = hands.map((hand, index) => ({
    hand,
    index,
    handedness: handednesses[index]?.[0]?.categoryName
  }));
  const rightHand = classified.find((item) => item.handedness === "Right");
  const leftHand = classified.find((item) => item.handedness === "Left");

  if (rightHand) {
    return {
      primary: rightHand,
      secondary: classified.filter((item) => item.index !== rightHand.index)
    };
  }

  if (leftHand) {
    return {
      primary: leftHand,
      secondary: classified.filter((item) => item.index !== leftHand.index)
    };
  }

  const primary = classified.reduce((best, item) => {
    const bestPalm = averagePoint([best.hand[0], best.hand[5], best.hand[9], best.hand[13], best.hand[17]]);
    const handPalm = averagePoint([item.hand[0], item.hand[5], item.hand[9], item.hand[13], item.hand[17]]);
    const bestDistance = Math.hypot(bestPalm.x - 0.5, bestPalm.y - 0.5);
    const handDistance = Math.hypot(handPalm.x - 0.5, handPalm.y - 0.5);
    return handDistance < bestDistance ? item : best;
  }, classified[0]);

  return {
    primary,
    secondary: classified.filter((item) => item.index !== primary.index)
  };
}

const handConnections = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17]
] as const;

const palmOutline = [0, 5, 9, 13, 17, 0] as const;

function drawSingleHand(
  context: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  points: Array<{ x: number; y: number; time: number }>,
  width: number,
  height: number,
  ratio: number
) {
  const toCanvas = (point: { x: number; y: number }) => ({ x: (1 - point.x) * width, y: point.y * height });

  context.lineCap = "round";
  context.lineJoin = "round";
  context.setLineDash([]);

  context.beginPath();
  palmOutline.forEach((index, order) => {
    const point = toCanvas(landmarks[index]);
    if (order === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.strokeStyle = "rgba(143, 174, 232, 0.92)";
  context.lineWidth = 4 * ratio;
  context.stroke();

  handConnections.forEach(([from, to]) => {
    const start = toCanvas(landmarks[from]);
    const end = toCanvas(landmarks[to]);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.strokeStyle = "rgba(219, 125, 159, 0.88)";
    context.lineWidth = 3 * ratio;
    context.stroke();
  });

  const now = Date.now();
  const trail = points.filter((point) => now - point.time < 1200);
  for (let index = 1; index < trail.length; index += 1) {
    const previous = trail[index - 1];
    const current = trail[index];
    const alpha = 0.16 + (index / trail.length) * 0.72;
    context.beginPath();
    context.strokeStyle = `rgba(111, 214, 196, ${alpha})`;
    context.lineWidth = (3 + (index / trail.length) * 4) * ratio;
    context.moveTo((1 - previous.x) * width, previous.y * height);
    context.lineTo((1 - current.x) * width, current.y * height);
    context.stroke();
  }

  context.setLineDash([]);

  [4, 8].forEach((index) => {
    const point = toCanvas(landmarks[index]);
    context.beginPath();
    context.fillStyle =
      index === 4
        ? "rgba(246, 200, 95, 0.95)"
        : "rgba(111, 214, 196, 0.95)";
    context.arc(point.x, point.y, 6 * ratio, 0, Math.PI * 2);
    context.fill();
  });

  const palm = averagePoint([landmarks[0], landmarks[5], landmarks[9], landmarks[13], landmarks[17]]);
  const center = toCanvas(palm);
  context.beginPath();
  context.fillStyle = "rgba(255, 255, 255, 0.9)";
  context.arc(center.x, center.y, 5 * ratio, 0, Math.PI * 2);
  context.fill();
}

function drawHandsOverlay(
  canvas: HTMLCanvasElement | null,
  primaryLandmarks: NormalizedLandmark[] | null,
  primaryPoints: Array<{ x: number; y: number; time: number }>,
  secondaryLandmarks: NormalizedLandmark[] | null,
  secondaryPoints: Array<{ x: number; y: number; time: number }>
) {
  if (!canvas) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, width, height);

  if (secondaryLandmarks) {
    drawSingleHand(context, secondaryLandmarks, secondaryPoints, width, height, ratio);
  }

  if (primaryLandmarks) {
    drawSingleHand(context, primaryLandmarks, primaryPoints, width, height, ratio);
  }
}

export function GiftExperience({ actionRight, gift }: { actionRight?: ReactNode; gift: GiftDraft }) {
  const { config, update: updateConfig } = useGestureConfigState();
  // 关键修复：showGuide 默认 false，让用户能直接看到礼物/互动区域。
  // 之前的默认值 true 会让 guide-overlay（z-index:20 + backdrop-filter:blur）
  // 在用户刚进礼物页时直接盖住整个屏幕，导致用户以为"没进礼物页"。
  // 现在用户可以主动点击 ? 按钮或 ?/启动摄像头 浮层再呼出引导。
  const [showGuide, setShowGuide] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [guideMode, setGuideMode] = useState<GestureState["mode"]>("touch");
  const [cameraStarting, setCameraStarting] = useState(false);
  const [handTrackingReady, setHandTrackingReady] = useState(false);
  const [hasCameraAccess, setHasCameraAccess] = useState(false);
  const [cameraStage, setCameraStage] = useState<CameraStage>("idle");
  const [cameraDiagnostics, setCameraDiagnostics] = useState<CameraDiagnostics>({
    secureContext: true,
    apiSupported: true,
    permission: "unknown",
    lastErrorName: ""
  });
  const [debugSamples, setDebugSamples] = useState<DebugSample[]>([]);
  const [debugHint, setDebugHint] = useState("等待摄像头开启...");
  const [firstFrameLatency, setFirstFrameLatency] = useState<number | null>(null);
  const [lastErrorStack, setLastErrorStack] = useState<string>("");
  const debugBufferRef = useRef(createDebugBuffer());
  const fpsCountRef = useRef<{ lastTime: number; frames: number }>({ lastTime: 0, frames: 0 });
  const fpsValueRef = useRef(0);
  const firstFrameTimeRef = useRef<number | null>(null);
  const cameraStreamStartedAtRef = useRef<number | null>(null);
  const [gesture, setGesture] = useState<GestureState>({
    mode: "touch",
    type: "none",
    windPower: 18,
    plantHeight: 62,
    volume: calculateVolume(62, 18),
    flowerOpen: true,
    flowerColorIndex: 0
  });
  const [flowerColor, setFlowerColor] = useState(themes[gift.theme].flower[0]);
  const startRef = useRef<{ x: number; y: number; height: number; wind: number; volume: number } | null>(null);
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);
  const movedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const guideVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const detectionFrameRef = useRef<number | null>(null);
  const previousPalmRef = useRef<{ x: number; y: number } | null>(null);
  const previousHandPalmsRef = useRef<Record<string, { x: number; y: number }>>({});
  const smoothedPalmRef = useRef<{ x: number; y: number } | null>(null);
  const lastCameraControlRef = useRef<{ height: number; wind: number; time: number }>({ height: 62, wind: 18, time: 0 });
  const cameraHeightOriginRef = useRef<{ y: number; height: number } | null>(null);
  const fusionModeRef = useRef<{ mode: "fuse" | "primary"; streak: number }>({ mode: "primary", streak: 0 });
  const lastHandSeenAtRef = useRef(0);
  const trailRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
  const secondaryTrailRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
  const lastColorGestureRef = useRef(0);
  const pinchActiveRef = useRef(false);
  const lastCameraOpenRef = useRef<boolean | null>(null);
  const openCandidateRef = useRef<{ value: boolean; since: number } | null>(null);
  const gestureModeRef = useRef<GestureState["mode"]>("touch");

  const theme = themes[gift.theme];
  const windOffset = gesture.windPower - 50;
  const windDisplay = Math.abs(windOffset) < 8 ? "微风 0" : `${windOffset > 0 ? "东风" : "西风"} +${Math.abs(windOffset)}`;
  const blessingLines = useMemo(() => {
    const density = gift.blessingDensity ?? 50;
    const lineCount = density === 15 ? 2 : density === 30 ? 3 : density === 50 ? 5 : 7;
    const gapMultiplier = gift.blessingLineGap ?? 1.6;
    const baseGap = density / Math.max(1, lineCount);
    const gap = baseGap * gapMultiplier;
    const maxTop = Math.max(4, density - 4);
    return Array.from({ length: lineCount }, (_, index) => Math.min(maxTop, 4 + index * gap));
  }, [gift.blessingDensity, gift.blessingLineGap]);

  useEffect(() => {
    setFlowerColor(theme.flower[0]);
  }, [theme.flower]);

  useEffect(
    () => () => {
      if (detectionFrameRef.current) {
        window.cancelAnimationFrame(detectionFrameRef.current);
        detectionFrameRef.current = null;
      }
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      handLandmarkerRef.current?.close();
      handLandmarkerRef.current = null;
      trailRef.current = [];
    },
    []
  );

  useEffect(() => {
    updateCameraDiagnostics();
  }, []);

  useEffect(() => {
    const stream = cameraStreamRef.current;
    if (!stream || gesture.mode !== "camera") {
      return;
    }

    [videoRef.current, guideVideoRef.current].forEach((video) => {
      if (!video) {
        return;
      }
      video.srcObject = stream;
      video.play().catch(() => undefined);
    });
  }, [gesture.mode, guideMode, showGuide]);

  function updateGesture(next: Partial<GestureState>) {
    if (next.mode) {
      gestureModeRef.current = next.mode;
    }
    setGesture((current) => ({ ...current, ...next }));
  }

  async function updateCameraDiagnostics(lastErrorName?: string) {
    if (typeof window === "undefined") {
      return;
    }

    const secureContext = window.isSecureContext;
    const apiSupported = Boolean(navigator.mediaDevices?.getUserMedia);
    let permission: CameraDiagnostics["permission"] = "unknown";

    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: "camera" as PermissionName });
        permission = status.state;
      } catch {
        permission = "unsupported";
      }
    } else {
      permission = "unsupported";
    }

    setCameraDiagnostics((current) => ({
      secureContext,
      apiSupported,
      permission,
      lastErrorName: lastErrorName ?? current.lastErrorName
    }));
  }

  function changeFlowerColor() {
    const options = extraFlowerColors.filter((color) => color !== flowerColor);
    const nextColor = options[Math.floor(Math.random() * options.length)] ?? theme.flower[0];
    setFlowerColor(nextColor);
    updateGesture({ type: "clap", flowerColorIndex: gesture.flowerColorIndex + 1 });
  }

  function stopHandDetection() {
    if (detectionFrameRef.current) {
      window.cancelAnimationFrame(detectionFrameRef.current);
      detectionFrameRef.current = null;
    }
    previousPalmRef.current = null;
    previousHandPalmsRef.current = {};
    smoothedPalmRef.current = null;
    lastCameraOpenRef.current = null;
    openCandidateRef.current = null;
    pinchActiveRef.current = false;
    fusionModeRef.current = { mode: "primary", streak: 0 };
    lastHandSeenAtRef.current = 0;
    lastCameraControlRef.current = { height: gesture.plantHeight, wind: gesture.windPower, time: 0 };
    cameraHeightOriginRef.current = null;
    trailRef.current = [];
    secondaryTrailRef.current = [];
    drawHandsOverlay(previewCanvasRef.current, null, trailRef.current, null, secondaryTrailRef.current);
    drawHandsOverlay(guideCanvasRef.current, null, trailRef.current, null, secondaryTrailRef.current);
  }

  function switchToTouchMode(message = "已切换为触摸模式，你可以用手指继续完成互动。") {
    stopHandDetection();
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setGuideMode("touch");
    setHandTrackingReady(false);
    setCameraStarting(false);
    setCameraStage("touch-fallback");
    setCameraMessage(message);
    updateGesture({ mode: "touch", type: "none" });
  }

  function getCameraErrorMessage(error: unknown) {
    if (error instanceof DOMException) {
      if (error.name === "NotAllowedError" || error.name === "SecurityError") {
        return "摄像头权限被拒绝，或当前页面不是安全来源，已自动切换为触摸模式。";
      }

      if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
        return "没有找到可用摄像头，已自动切换为触摸模式。";
      }

      if (error.name === "NotReadableError" || error.name === "AbortError") {
        return "摄像头可能正被其他应用占用，已自动切换为触摸模式。";
      }
    }

    return "摄像头开启失败，已自动切换为触摸模式。";
  }

  function getInsecureCameraMessage() {
    return "手机浏览器通常只允许 HTTPS 页面访问摄像头；当前局域网 HTTP 页面无法唤起摄像头，已自动切换为触摸模式。";
  }

  function openCurrentGuide() {
    setGuideMode(gesture.mode);
    setShowGuide(true);
  }

  async function ensureHandLandmarker() {
    if (handLandmarkerRef.current) {
      return handLandmarkerRef.current;
    }

    const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks(visionWasmUrl);
    const landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: handLandmarkerModelUrl,
        delegate: "GPU"
      },
      numHands: 2,
      runningMode: "VIDEO"
    });
    handLandmarkerRef.current = landmarker;
    return landmarker;
  }

  function getCameraHandSignal(item: TrackedHand, cfg: typeof config) {
    const landmarks = item.hand;
    const rawPalm = averagePoint([landmarks[0], landmarks[5], landmarks[9], landmarks[13], landmarks[17]]);
    const palm = { x: 1 - rawPalm.x, y: rawPalm.y };
    const previousPalm = previousHandPalmsRef.current[item.handedness ?? String(item.index)];
    const horizontalVelocity = previousPalm ? palm.x - previousPalm.x : 0;
    const verticalVelocity = previousPalm ? previousPalm.y - palm.y : 0;
    if (!cameraHeightOriginRef.current) {
      cameraHeightOriginRef.current = {
        y: palm.y,
        height: lastCameraControlRef.current.time > 0 ? lastCameraControlRef.current.height : gesture.plantHeight
      };
    }
    const heightOrigin = cameraHeightOriginRef.current;
    const baseHeight = heightOrigin.height + (heightOrigin.y - palm.y) * cfg.heightDisplacementGain;
    const height = clamp(baseHeight + verticalVelocity * cfg.heightVelocityGain, 0, 100);
    const edgeFactor = Math.abs(height - 50) / 50;
    const movementWind = clamp(50 + horizontalVelocity * cfg.horizontalVelocityGain + (palm.x - 0.5) * cfg.horizontalOffsetGain, 0, 100);
    const rollWind = normalizeRollWind(landmarks, item.handedness, cfg.palmRollGain);
    const swingWind = fingertipSwingScore(landmarks, palm, cfg.fingertipSwingGain);
    const movementWeight = 0.36 - edgeFactor * 0.1;
    const rollWeight = 0.3 + edgeFactor * cfg.edgeRollWeightBoost;
    const swingWeight = 0.34 + edgeFactor * cfg.edgeSwingWeightBoost;
    const weightTotal = movementWeight + rollWeight + swingWeight;
    const blendedWind = (movementWind * movementWeight + rollWind * rollWeight + swingWind * swingWeight) / weightTotal;
    const wind = Math.round(clamp(50 + (blendedWind - 50) * (1 + edgeFactor * cfg.edgeWindAmplify), 0, 100));
    const spreadScore = fingerSpreadScore(landmarks, rawPalm);
    const pinchDistance = distanceBetween(landmarks[4], landmarks[8]);
    const palmWidth = Math.max(0.001, distanceBetween(landmarks[5], landmarks[17]));

    return {
      item,
      palm,
      height,
      wind,
      edgeFactor,
      horizontalVelocity,
      verticalVelocity,
      strength: Math.abs(wind - 50) + Math.abs(horizontalVelocity * 900),
      openCandidate: spreadScore > cfg.openSpreadThreshold,
      openSpread: spreadScore,
      pinchRatio: pinchDistance / palmWidth
    };
  }

  function applyCameraLandmarks(primaryHand: TrackedHand, secondaryHand: TrackedHand | null, cfg: typeof config) {
    const primarySignal = getCameraHandSignal(primaryHand, cfg);
    const secondarySignal = secondaryHand ? getCameraHandSignal(secondaryHand, cfg) : null;
    const directionsMatch =
      !secondarySignal ||
      primarySignal.strength < 12 ||
      secondarySignal.strength < 12 ||
      Math.sign(primarySignal.wind - 50) === Math.sign(secondarySignal.wind - 50) ||
      Math.abs(primarySignal.wind - secondarySignal.wind) < cfg.twoHandDirectionTolerance;
    const heightMatches = !secondarySignal || Math.abs(primarySignal.height - secondarySignal.height) < cfg.twoHandHeightTolerance;
    const fuseCandidate = Boolean(secondarySignal && directionsMatch && heightMatches);
    const fusionMode = fusionModeRef.current;
    if ((fuseCandidate && fusionMode.mode === "fuse") || (!fuseCandidate && fusionMode.mode === "primary")) {
      fusionMode.streak = 0;
    } else {
      fusionMode.streak += 1;
      if (fusionMode.streak >= cfg.fusionStreakFrames) {
        fusionMode.mode = fuseCandidate ? "fuse" : "primary";
        fusionMode.streak = 0;
      }
    }
    fusionModeRef.current = fusionMode;
    const shouldFuse = Boolean(secondarySignal && fusionMode.mode === "fuse");
    const controlSignal =
      shouldFuse && secondarySignal
        ? {
            palm: {
              x: (primarySignal.palm.x + secondarySignal.palm.x) / 2,
              y: (primarySignal.palm.y + secondarySignal.palm.y) / 2
            },
            height: (primarySignal.height + secondarySignal.height) / 2,
            wind: Math.round((primarySignal.wind + secondarySignal.wind) / 2),
            openCandidate: (primarySignal.openCandidate && secondarySignal.openCandidate) || primarySignal.openCandidate,
            pinchRatio: Math.min(primarySignal.pinchRatio, secondarySignal.pinchRatio)
          }
        : primarySignal;

    const palm = smoothedPalmRef.current
      ? {
          x: smoothedPalmRef.current.x * cfg.palmSmoothKeep + controlSignal.palm.x * (1 - cfg.palmSmoothKeep),
          y: smoothedPalmRef.current.y * cfg.palmSmoothKeep + controlSignal.palm.y * (1 - cfg.palmSmoothKeep)
        }
      : controlSignal.palm;
    smoothedPalmRef.current = palm;

    const previousPalm = previousPalmRef.current;
    previousPalmRef.current = palm;
    previousHandPalmsRef.current = {
      [primaryHand.handedness ?? String(primaryHand.index)]: primarySignal.palm,
      ...(secondarySignal ? { [secondaryHand?.handedness ?? String(secondaryHand?.index)]: secondarySignal.palm } : {})
    };

    const previousControl = lastCameraControlRef.current;
    let nextHeight = Math.round(controlSignal.height);
    let nextWind = controlSignal.wind;
    if (previousControl.time > 0) {
      nextHeight = Math.round(clamp(nextHeight, previousControl.height - cfg.heightMaxStep, previousControl.height + cfg.heightMaxStep));
      nextWind = Math.round(clamp(nextWind, previousControl.wind - cfg.windMaxStep, previousControl.wind + cfg.windMaxStep));
    }
    const openCandidate = controlSignal.openCandidate;
    const pinchRatio = controlSignal.pinchRatio;
    const now = Date.now();

    trailRef.current = [...trailRef.current, { x: palm.x, y: palm.y, time: now }]
      .filter((point) => now - point.time < 1200)
      .slice(-28);

    if (secondarySignal) {
      secondaryTrailRef.current = [...secondaryTrailRef.current, { x: secondarySignal.palm.x, y: secondarySignal.palm.y, time: now }]
        .filter((point) => now - point.time < 1200)
        .slice(-28);
    } else {
      secondaryTrailRef.current = [];
    }

    drawHandsOverlay(previewCanvasRef.current, primaryHand.hand, trailRef.current, secondaryHand?.hand ?? null, secondaryTrailRef.current);
    drawHandsOverlay(guideCanvasRef.current, primaryHand.hand, trailRef.current, secondaryHand?.hand ?? null, secondaryTrailRef.current);

    const pinchCandidate = pinchRatio < cfg.pinchTriggerRatio;
    const pinchReleased =
      primarySignal.pinchRatio > cfg.pinchReleaseRatio && (!secondarySignal || secondarySignal.pinchRatio > cfg.pinchReleaseRatio);
    let colorTriggered = false;
    if (pinchReleased) {
      pinchActiveRef.current = false;
    }
    if (pinchCandidate && !pinchActiveRef.current && now - lastColorGestureRef.current > cfg.pinchCooldownMs) {
      pinchActiveRef.current = true;
      lastColorGestureRef.current = now;
      changeFlowerColor();
      colorTriggered = true;
    }

    const movedX = previousPalm ? Math.abs(palm.x - previousPalm.x) : 0;
    const movedY = previousPalm ? Math.abs(palm.y - previousPalm.y) : 0;
    const currentOpen = lastCameraOpenRef.current ?? gesture.flowerOpen;
    let nextOpen = currentOpen;

    if (!openCandidateRef.current || openCandidateRef.current.value !== openCandidate) {
      openCandidateRef.current = { value: openCandidate, since: now };
    } else if (now - openCandidateRef.current.since > cfg.openDebounceMs) {
      nextOpen = openCandidate;
    }
    const openTransitionActive = openCandidateRef.current ? now - openCandidateRef.current.since < cfg.openDebounceMs - 20 : false;
    if (openTransitionActive && previousControl.time > 0) {
      nextHeight = Math.round(previousControl.height * cfg.openTransitionKeep + nextHeight * (1 - cfg.openTransitionKeep));
      nextWind = Math.round(previousControl.wind * cfg.openTransitionKeep + nextWind * (1 - cfg.openTransitionKeep));
    }

    const nextType: GestureState["type"] =
      colorTriggered
        ? "clap"
        : lastCameraOpenRef.current !== nextOpen
        ? nextOpen
          ? "open_hand"
          : "fist"
        : movedY > movedX * cfg.moveYRatio && (movedY > cfg.movePixelThreshold || Math.abs(nextHeight - previousControl.height) > cfg.moveHeightDeltaThreshold)
          ? "vertical_wave"
          : movedX > cfg.movePixelThreshold || Math.abs(nextWind - 50) > cfg.moveWindDeltaThreshold
            ? "horizontal_wave"
            : "none";

    lastCameraOpenRef.current = nextOpen;
    lastCameraControlRef.current = { height: nextHeight, wind: nextWind, time: now };
    lastHandSeenAtRef.current = now;

    // 真机调参：每帧推入采样（FPS、手数、捏合比、张开分、当前高度/风力、融合模式）。
    const fpsState = fpsCountRef.current;
    if (fpsState.lastTime === 0) {
      fpsState.lastTime = now;
      fpsState.frames = 1;
    } else {
      fpsState.frames += 1;
      const elapsed = now - fpsState.lastTime;
      if (elapsed >= 500) {
        fpsValueRef.current = Math.round((fpsState.frames * 1000) / elapsed);
        fpsState.lastTime = now;
        fpsState.frames = 0;
      }
    }
    if (firstFrameTimeRef.current === null) {
      firstFrameTimeRef.current = now;
      const latency = Math.max(0, now - (cameraStreamStartedAtRef.current ?? now));
      setFirstFrameLatency(latency);
    }
    debugBufferRef.current.push({
      time: now,
      hands: 1 + (secondarySignal ? 1 : 0),
      fps: fpsValueRef.current,
      pinchRatio,
      openSpread: primarySignal.openSpread,
      height: nextHeight,
      wind: nextWind,
      fusion: shouldFuse ? "fuse" : "primary"
    });
    const snapshot = debugBufferRef.current.snapshot();
    setDebugSamples(snapshot.samples);
    setDebugHint(`已识别 ${snapshot.samples.length} 帧 · ${fpsValueRef.current || "--"} FPS · ${shouldFuse ? "双手融合" : "单手"}`);

    updateGesture({
      mode: "camera",
      type: nextType,
      plantHeight: nextHeight,
      windPower: nextWind,
      volume: calculateVolume(nextHeight, nextWind),
      flowerOpen: nextOpen
    });
  }

  function startHandDetection() {
    if (detectionFrameRef.current) {
      window.cancelAnimationFrame(detectionFrameRef.current);
    }

    const detect = () => {
      const video = videoRef.current;
      const landmarker = handLandmarkerRef.current;

      if (!video || !landmarker || gestureModeRef.current !== "camera") {
        detectionFrameRef.current = null;
        return;
      }

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        const result = landmarker.detectForVideo(video, performance.now());
        const selectedHands = selectHands(result.landmarks, result.handednesses);
        const secondaryLandmarks = selectedHands.secondary[0] ?? null;
        if (selectedHands.primary) {
          applyCameraLandmarks(selectedHands.primary, secondaryLandmarks, config);
        } else {
          const now = Date.now();
          if (now - lastHandSeenAtRef.current < config.lostHandHoldMs) {
            detectionFrameRef.current = window.requestAnimationFrame(detect);
            return;
          }
          previousPalmRef.current = null;
          previousHandPalmsRef.current = {};
          smoothedPalmRef.current = null;
          lastCameraOpenRef.current = null;
          pinchActiveRef.current = false;
          openCandidateRef.current = null;
          cameraHeightOriginRef.current = null;
          fusionModeRef.current = { mode: "primary", streak: 0 };
          trailRef.current = [];
          secondaryTrailRef.current = [];
          drawHandsOverlay(previewCanvasRef.current, null, trailRef.current, null, secondaryTrailRef.current);
          drawHandsOverlay(guideCanvasRef.current, null, trailRef.current, null, secondaryTrailRef.current);
          updateGesture({ mode: "camera", type: "none" });
        }
      }

      detectionFrameRef.current = window.requestAnimationFrame(detect);
    };

    detectionFrameRef.current = window.requestAnimationFrame(detect);
  }

  async function requestCameraStream() {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
    } catch {
      return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true
      });
    }
  }

  async function enableCameraGesture() {
    if (cameraStarting) {
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      updateCameraDiagnostics("InsecureContext");
      setCameraMessage(getInsecureCameraMessage());
      setGuideMode("touch");
      updateGesture({ mode: "touch", type: "none" });
      setHasCameraAccess(false);
      setCameraStage("touch-fallback");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      updateCameraDiagnostics("UnsupportedMediaDevices");
      setCameraMessage("当前浏览器不支持摄像头访问，已自动使用触摸模式。");
      setGuideMode("touch");
      updateGesture({ mode: "touch", type: "none" });
      setHasCameraAccess(false);
      setCameraStage("touch-fallback");
      return;
    }

    setCameraStarting(true);
    setHandTrackingReady(false);
    updateCameraDiagnostics("");
    lastCameraControlRef.current = { height: gesture.plantHeight, wind: gesture.windPower, time: 0 };
    cameraHeightOriginRef.current = null;
    fusionModeRef.current = { mode: "primary", streak: 0 };
    setCameraStage("requesting");
    setCameraMessage("正在启动摄像头...");

    try {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await requestCameraStream();

      cameraStreamRef.current = stream;
      cameraStreamStartedAtRef.current = Date.now();
      firstFrameTimeRef.current = null;
      setFirstFrameLatency(null);
      setLastErrorStack("");
      setHasCameraAccess(true);
      updateCameraDiagnostics("");
      updateGesture({ mode: "camera", type: "none" });
      setGuideMode("camera");
      setCameraStage("tracking-loading");
      setCameraMessage("摄像头已开启，正在准备手势识别...");
      setCameraStarting(false);

      try {
        await ensureHandLandmarker();
        setHandTrackingReady(true);
        setCameraStage("tracking-ready");
        setCameraMessage("手势识别已开启；画面仅在本机实时识别，不保存、不上传。");
        window.setTimeout(startHandDetection, 0);
      } catch (error) {
        stopHandDetection();
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
        const errorName = error instanceof DOMException ? error.name : "HandLandmarkerLoadError";
        updateCameraDiagnostics(errorName);
        setLastErrorStack(error instanceof Error ? error.stack ?? error.message : String(error));
        setGuideMode("touch");
        setHandTrackingReady(false);
        setCameraStage("touch-fallback");
        updateGesture({ mode: "touch", type: "none" });
        setCameraMessage("手势识别资源加载失败，已自动切换为触摸模式。你仍可以用下面的触摸方式完成互动和分享。");
      }
    } catch (error) {
      stopHandDetection();
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      const errorName = error instanceof DOMException ? error.name : "UnknownCameraError";
      updateCameraDiagnostics(errorName);
      setLastErrorStack(error instanceof Error ? error.stack ?? error.message : String(error));
      setGuideMode("touch");
      setHandTrackingReady(false);
      setHasCameraAccess(false);
      setCameraStage("touch-fallback");
      updateGesture({ mode: "touch", type: "none" });
      setCameraMessage(`${getCameraErrorMessage(error)}你仍可以用下面的触摸方式完成互动和分享。`);
    } finally {
      setCameraStarting(false);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (gesture.mode === "camera") {
      return;
    }
    startRef.current = {
      x: event.clientX,
      y: event.clientY,
      height: gesture.plantHeight,
      wind: gesture.windPower,
      volume: gesture.volume
    };
    movedRef.current = false;
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (gesture.mode === "camera") {
      return;
    }
    const start = startRef.current;
    if (!start) {
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absY > 8 && absY >= absX * 0.72) {
      movedRef.current = true;
      const nextHeight = Math.max(0, Math.min(100, start.height - Math.round(dy / 1.35)));
      updateGesture({
        type: "vertical_wave",
        plantHeight: nextHeight,
        volume: calculateVolume(nextHeight, gesture.windPower)
      });
    } else if (absX > 8 && absX > absY * 0.72) {
      movedRef.current = true;
      const nextWind = Math.max(0, Math.min(100, start.wind + Math.round(dx / 1.8)));
      updateGesture({
        type: "horizontal_wave",
        windPower: nextWind,
        volume: calculateVolume(gesture.plantHeight, nextWind)
      });
    }
  }

  function handlePointerUp() {
    if (gesture.mode === "camera") {
      return;
    }
    if (!startRef.current) {
      return;
    }
    const now = Date.now();
    startRef.current = null;

    if (movedRef.current) {
      return;
    }

    if (now - lastTapRef.current < 320) {
      if (tapTimerRef.current) {
        window.clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      changeFlowerColor();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      tapTimerRef.current = window.setTimeout(() => {
        updateGesture({ type: gesture.flowerOpen ? "fist" : "open_hand", flowerOpen: !gesture.flowerOpen });
        tapTimerRef.current = null;
      }, 260);
    }
  }

  const showInitialCameraGuide = guideMode === "touch" && !hasCameraAccess && (!cameraMessage || cameraStarting);
  const cameraModeButtonText = hasCameraAccess ? "回到手势" : cameraStarting ? "正在启动摄像头..." : "点击启动摄像头";

  return (
    <section
      className="gift-stage"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        startRef.current = null;
      }}
      style={
        {
          "--theme-wash": theme.wash,
          "--image-wash": gift.backgroundImageUrl ? theme.mask : theme.wash,
          "--theme-accent": theme.accent,
          "--theme-deep": theme.deep,
          "--theme-grass": theme.grass,
          "--theme-leaf": theme.leaf,
          "--theme-glow": theme.glow,
          "--theme-box": theme.box,
          "--theme-box-top": theme.boxTop,
          "--theme-note": theme.note,
          "--theme-heart": theme.heart,
          "--flower-scale": gesture.flowerOpen ? 1 : 0.74,
          "--flower-color": flowerColor,
          "--wind-shift": `${gesture.windPower - 35}px`,
          "--wind-opacity": gesture.type === "horizontal_wave" ? Math.min(0.62, 0.18 + gesture.windPower / 180) : 0.16
        } as React.CSSProperties
      }
    >
      <GiftBackground gift={gift} />
      <div className="wind-layer" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className={`camera-input ${gesture.mode === "camera" ? "visible" : ""}`}>
        <video ref={videoRef} muted playsInline aria-label="摄像头实时预览" />
        <canvas ref={previewCanvasRef} aria-hidden="true" />
      </div>

      <div className="data-panel">
        <div>
          <p className="wind-row">
            风力 {windDisplay}
            <button
              className="reset-wind-btn"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() =>
                updateGesture({
                  type: "horizontal_wave",
                  windPower: 50,
                  volume: calculateVolume(gesture.plantHeight, 50)
                })
              }
              type="button"
              aria-label="回到微风"
              title="回到微风"
            >
              ↻
            </button>
          </p>
          <p>模式 {gesture.mode === "camera" ? "摄像头" : "触摸"}</p>
          <p>摄像头 {cameraStageLabel[cameraStage]}</p>
          <p>高度 {gesture.plantHeight}</p>
          <p>手势 {gestureLabel[gesture.type]}</p>
        </div>
        <button
          className="help-btn"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={openCurrentGuide}
          type="button"
          aria-label="查看手势引导"
        >
          ?
        </button>
        <button
          className="mode-switch-btn"
          disabled={cameraStarting}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (gesture.mode === "camera") {
              switchToTouchMode();
            } else {
              enableCameraGesture();
            }
          }}
          type="button"
        >
          {gesture.mode === "camera" ? "切换触摸" : hasCameraAccess ? "回到手势" : cameraStarting ? "启动中" : "启动摄像头"}
        </button>
      </div>

      {gift.blessingMarqueeEnabled ? (
      <div className="marquee-layer" aria-hidden="true">
        {blessingLines.map((top, index) => (
          <span
            className="marquee-line"
            key={top}
            style={
              {
                top: `${top}%`,
                color: gift.blessingColor,
                fontSize: `${gift.blessingFontSize}px`,
                animationDuration: `${22 / gift.blessingSpeed + index * 1.4}s`,
                animationDelay: `${index * -4.2}s`,
                "--line-hop-delay": `${index * -0.52}s`
              } as React.CSSProperties
            }
          >
            <span
              className="marquee-wave"
              style={{
                animationDelay: `${index * -0.7}s`
              }}
            >
              <WaveText text={`${gift.blessingText} · ${gift.blessingText}`} />
            </span>
          </span>
        ))}
      </div>
      ) : null}

      {Array.from({ length: 16 }).map((_, index) => (
        <i
          className="particle"
          key={index}
          style={{
            left: `${(index * 17) % 100}%`,
            top: `${10 + ((index * 23) % 76)}%`,
            animationDelay: `${index * -0.4}s`,
            opacity: 0.28 + (index % 4) * 0.1
          }}
        />
      ))}

      <div className="music-box-wrap">
        <div className="garden">
          <div className="note note-a">♪</div>
          <div className="note note-b">♫</div>
          <div className="note note-c">♪</div>
          <div className="grass-bed" />
          {plants.map((plant) => (
            <div
              className="plant"
              key={plant.x}
              style={
                {
                  "--plant-x": `${plant.x}px`,
                  "--plant-scale": plant.scale,
                  "--plant-height": `${38 + gesture.plantHeight * 3.25 + plant.heightOffset}px`,
                  "--sway-delay": `${plant.delay}s`,
                  "--sway-amount": `${plant.sway + (Math.max(0, Math.abs(windOffset) - 8) / 8.2) * plant.wind}deg`,
                  "--wind-tilt": `${Math.abs(windOffset) < 8 ? 0 : (windOffset / 4.9) * plant.wind}deg`
                } as React.CSSProperties
              }
            >
              <div className="stem" />
              <div className="leaf left" />
              <div className="leaf right" />
              <div className="leaf high left" />
              <div className="leaf high right" />
              <div className={`flower ${gesture.flowerOpen ? "open" : "closed"}`}>
                {[0, 1, 2, 3, 4].map((item) => (
                  <span
                    className="petal"
                    key={item}
                    style={{ "--closed-rotation": `${item * 10 - 20}deg` } as React.CSSProperties}
                  />
                ))}
                <span className="heart" />
              </div>
            </div>
          ))}
          <div className="music-box">
            <span className="box-tag">{gift.title}</span>
            <strong>BloomBeat</strong>
            <small>{gift.songTitle}</small>
          </div>
        </div>
      </div>

      <div
        className="music-controls"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <SynthBgmButton audioUrl={gift.audioUrl} bgmPresetId={gift.bgmPresetId} autoStart={!showGuide} volume={gesture.volume} />
      </div>

      <GestureDebugPanel
        config={config}
        diagnosticHint={debugHint}
        onChange={updateConfig}
        samples={debugSamples}
        visible={gesture.mode === "camera"}
      />

      {actionRight ? (
        <div
          className="gift-action-right"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {actionRight}
        </div>
      ) : null}

      {showGuide && gesture.mode !== "camera" && !hasCameraAccess && !cameraStarting ? (
        <button
          className="camera-launch-fab"
          aria-label="启动摄像头"
          title="启动摄像头"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            enableCameraGesture();
          }}
          type="button"
        >
          <CameraLaunchIcon />
        </button>
      ) : null}

      {showGuide ? (
        <div className="guide-overlay" onPointerDown={(event) => event.stopPropagation()}>
          <div className="guide-card">
            <section className="guide-section primary-guide">
              <strong>{guideMode === "camera" || showInitialCameraGuide ? "舞动双手，唤醒这片花园" : "用触摸继续唤醒花园"}</strong>
              {guideMode === "camera" ? (
                <div className="camera-live-panel">
                  <video ref={guideVideoRef} muted playsInline aria-label="摄像头实时预览" />
                  <canvas ref={guideCanvasRef} aria-hidden="true" />
                  <span>{handTrackingReady ? "手势识别中" : cameraStageLabel[cameraStage]}</span>
                </div>
              ) : null}
              <div className={`camera-status-pill ${cameraStage}`}>
                摄像头状态：{cameraStageLabel[cameraStage]}
              </div>
              <div className="camera-diagnostics" aria-label="摄像头诊断">
                <span>
                  安全来源 <strong>{cameraDiagnostics.secureContext ? "可用" : "需要 HTTPS"}</strong>
                </span>
                <span>
                  浏览器摄像头 <strong>{cameraDiagnostics.apiSupported ? "支持" : "不支持"}</strong>
                </span>
                <span>
                  权限 <strong>{cameraPermissionLabel[cameraDiagnostics.permission]}</strong>
                </span>
                {cameraDiagnostics.lastErrorName ? (
                  <span>
                    最近错误 <strong>{cameraDiagnostics.lastErrorName}</strong>
                  </span>
                ) : null}
              </div>
              <div className="camera-diagnostics camera-diagnostics-extra" aria-label="摄像头真机诊断">
                <span>
                  设备 <strong>{typeof navigator !== "undefined" && navigator.userAgent ? navigator.userAgent.split(") ")[0].replace("(", "") : "未知"}</strong>
                </span>
                <span>
                  摄像头分辨率 <strong>{typeof window !== "undefined" && videoRef.current?.videoWidth ? `${videoRef.current.videoWidth}×${videoRef.current.videoHeight}` : "未就绪"}</strong>
                </span>
                <span>
                  首帧延迟 <strong>{firstFrameLatency === null ? "测量中" : `${firstFrameLatency}ms`}</strong>
                </span>
                <span>
                  已识别帧数 <strong>{debugSamples.length}</strong>
                </span>
                {lastErrorStack ? (
                  <span className="camera-diagnostics-stack">
                    错误详情 <strong>{lastErrorStack.split("\n")[0]}</strong>
                  </span>
                ) : null}
              </div>
            {showInitialCameraGuide ? (
              <button
                className="primary-btn guide-camera-btn"
                disabled={cameraStarting}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  enableCameraGesture();
                }}
                type="button"
              >
                {cameraModeButtonText}
              </button>
            ) : null}
            {guideMode === "camera" ? (
              <div className="guide-grid camera-guide-grid">
                <GuideItem icon="↕" title="掌心上移 / 下移" text="花朵长高变矮；越高声音越大，越矮声音越小" />
                <GuideItem icon="↔" title="手掌左右摇晃" text="掌心移动、手腕摇晃和指尖横摆都会改变西风 / 东风和音量" />
                <GuideItem icon="开" title="张开五指并拢双拳" text="花朵张开闭合" />
                <GuideItem icon="捏" title="拇指与食指孔雀形状捏合" text="颜色切换" />
              </div>
            ) : null}
            {guideMode === "touch" && !showInitialCameraGuide ? (
              <div className="guide-grid">
                <GuideItem icon="↕" title="上下滑动" text="越高声音越大，越矮声音越小" />
                <GuideItem icon="↔" title="左右滑动" text="越靠左声音越小，越靠右声音越大" />
                <GuideItem icon="◌" title="点击花朵" text="开放或闭合" />
                <GuideItem icon="✦" title="双击屏幕" text="整片花园统一换色" />
              </div>
            ) : null}
            {guideMode === "camera" ? <p className="hint">双手同向会一起参与识别；双手动作差别较大时优先按右手控制。</p> : null}
            {cameraMessage ? <p className="hint">{cameraMessage}</p> : null}
          </section>

          <button
            className="secondary-btn guide-mode-btn"
            disabled={cameraStarting}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (gesture.mode === "camera") {
                switchToTouchMode();
              } else {
                enableCameraGesture();
              }
            }}
            type="button"
          >
            {gesture.mode === "camera" ? "切换为触摸互动" : "回到摄像头手势"}
          </button>
            <button
              className="primary-btn"
              onClick={(event) => {
                event.stopPropagation();
                if (gesture.mode !== "camera") {
                  updateGesture({ mode: "touch", type: "none" });
                }
                setShowGuide(false);
              }}
              type="button"
            >
              我知道了
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GuideItem({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="guide-item">
      <span className="guide-icon">{icon}</span>
      <strong>{title}</strong>
      <p className="hint">{text}</p>
    </div>
  );
}

function CameraLaunchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        d="M9 4.5 7.5 6H4.5A2.5 2.5 0 0 0 2 8.5v9A2.5 2.5 0 0 0 4.5 20h15a2.5 2.5 0 0 0 2.5-2.5v-9A2.5 2.5 0 0 0 19.5 6h-3L15 4.5A1.5 1.5 0 0 0 13.94 4h-3.88A1.5 1.5 0 0 0 9 4.5Zm3 5.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 1.7a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WaveText({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((char, index) => (
        <span
          className="wave-char"
          key={`${char}-${index}`}
          style={
            {
              "--wave-y": `${Math.sin(index * 0.78) * 9}px`,
              "--char-hop": `${1.6 + (index % 5) * 0.55}px`,
              "--char-delay": `${index * -0.11}s`
            } as React.CSSProperties
          }
        >
          {char}
        </span>
      ))}
    </>
  );
}
