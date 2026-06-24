"use client";

import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { GiftDraft, GestureState, themes } from "@/lib/gift";
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

function calculateVolume(plantHeight: number, windPower: number) {
  const heightVolume = plantHeight * 0.72;
  const horizontalVolume = (windPower - 50) * 0.56;
  return Math.max(0, Math.min(100, Math.round(18 + heightVolume + horizontalVolume)));
}

export function GiftExperience({ actionRight, gift }: { actionRight?: ReactNode; gift: GiftDraft }) {
  const [showGuide, setShowGuide] = useState(true);
  const [cameraMessage, setCameraMessage] = useState("");
  const [guideMode, setGuideMode] = useState<GestureState["mode"]>("touch");
  const [cameraStarting, setCameraStarting] = useState(false);
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
  const cameraStreamRef = useRef<MediaStream | null>(null);

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
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    },
    []
  );

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
    setGesture((current) => ({ ...current, ...next }));
  }

  function changeFlowerColor() {
    const options = extraFlowerColors.filter((color) => color !== flowerColor);
    const nextColor = options[Math.floor(Math.random() * options.length)] ?? theme.flower[0];
    setFlowerColor(nextColor);
    updateGesture({ type: "clap", flowerColorIndex: gesture.flowerColorIndex + 1 });
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

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage("当前浏览器不支持摄像头访问，已自动使用触摸模式。");
      setGuideMode("touch");
      updateGesture({ mode: "touch", type: "none" });
      return;
    }

    setCameraStarting(true);
    setCameraMessage("正在启动摄像头...");

    try {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await requestCameraStream();

      cameraStreamRef.current = stream;
      updateGesture({ mode: "camera", type: "none" });
      setGuideMode("camera");
      setCameraMessage("摄像头已开启，当前进入手势模式；画面仅在本机实时识别，不保存、不上传。");
    } catch {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setGuideMode("touch");
      updateGesture({ mode: "touch", type: "none" });
      setCameraMessage("摄像头开启失败，已自动保持触摸模式。你仍可以用下面的触摸方式完成互动和分享。");
    } finally {
      setCameraStarting(false);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
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
      <video
        ref={videoRef}
        className={`camera-input ${gesture.mode === "camera" ? "visible" : ""}`}
        muted
        playsInline
        aria-label="摄像头实时预览"
      />

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
          <p>高度 {gesture.plantHeight}</p>
          <p>手势 {gestureLabel[gesture.type]}</p>
        </div>
        <button
          className="help-btn"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setShowGuide(true)}
          type="button"
          aria-label="查看手势引导"
        >
          ?
        </button>
      </div>

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
                animationDuration: `${18 / gift.blessingSpeed + index * 1.2}s`,
                animationDelay: `${index * -3.8}s`,
                "--line-hop-delay": `${index * -0.45}s`
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

      {Array.from({ length: 16 }).map((_, index) => (
        <i
          className="particle"
          key={index}
          style={{
            left: `${(index * 17) % 100}%`,
            top: `${10 + ((index * 23) % 76)}%`,
            animationDelay: `${index * -0.4}s`,
            opacity: 0.36 + (index % 4) * 0.12
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
        <SynthBgmButton audioUrl={gift.audioUrl} autoStart={!showGuide} volume={gesture.volume} />
      </div>

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

      {showGuide ? (
        <div className="guide-overlay" onPointerDown={(event) => event.stopPropagation()}>
          <div className="guide-card">
            <section className="guide-section primary-guide">
              <strong>舞动双手，唤醒这片花园</strong>
              {guideMode === "camera" ? (
                <div className="camera-live-panel">
                  <video ref={guideVideoRef} muted playsInline aria-label="摄像头实时预览" />
                  <span>摄像头实时预览</span>
                </div>
              ) : null}
              {guideMode === "touch" ? (
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
                  {cameraStarting ? "正在启动摄像头..." : "点击启动摄像头"}
                </button>
              ) : null}
              {guideMode === "camera" ? (
                <div className="guide-grid camera-guide-grid">
                  <GuideItem icon="↕" title="手掌上下摆动" text="花朵长高变矮" />
                  <GuideItem icon="↔" title="手掌左右摇晃" text="花朵左右摇晃" />
                  <GuideItem icon="开" title="张开五指并拢双拳" text="花朵张开闭合" />
                  <GuideItem icon="捏" title="拇指与食指孔雀形状捏合" text="颜色切换" />
                </div>
              ) : null}
              {cameraMessage ? <p className="hint">{cameraMessage}</p> : null}
            </section>

            <section className="guide-section fallback-guide">
              <strong>如果无法唤起摄像头，你可以按照下列方式触摸屏幕，完成交互。</strong>
              <div className="guide-grid">
                <GuideItem icon="↕" title="上下滑动" text="越高声音越大，越矮声音越小" />
                <GuideItem icon="↔" title="左右滑动" text="越靠左声音越小，越靠右声音越大" />
                <GuideItem icon="◌" title="点击花朵" text="开放或闭合" />
                <GuideItem icon="✦" title="双击屏幕" text="整片花园统一换色" />
              </div>
            </section>
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
