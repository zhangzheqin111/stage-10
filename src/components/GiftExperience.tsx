"use client";

import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { GiftDraft, GestureState, themes } from "@/lib/gift";
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

export function GiftExperience({ gift }: { gift: GiftDraft }) {
  const [showGuide, setShowGuide] = useState(true);
  const [gesture, setGesture] = useState<GestureState>({
    mode: "touch",
    type: "none",
    windPower: 18,
    plantHeight: 62,
    volume: 58,
    flowerOpen: true,
    flowerColorIndex: 0
  });
  const [flowerColor, setFlowerColor] = useState(themes[gift.theme].flower[0]);
  const startRef = useRef<{ x: number; y: number; height: number; wind: number; volume: number } | null>(null);
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);
  const movedRef = useRef(false);

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

  useEffect(() => {
    const timer = window.setTimeout(() => setShowGuide(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  function updateGesture(next: Partial<GestureState>) {
    setGesture((current) => ({ ...current, ...next }));
  }

  function changeFlowerColor() {
    const options = extraFlowerColors.filter((color) => color !== flowerColor);
    const nextColor = options[Math.floor(Math.random() * options.length)] ?? theme.flower[0];
    setFlowerColor(nextColor);
    updateGesture({ type: "clap", flowerColorIndex: gesture.flowerColorIndex + 1 });
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
      updateGesture({ type: "vertical_wave", plantHeight: nextHeight });
    } else if (absX > 8 && absX > absY * 0.72) {
      movedRef.current = true;
      const nextWind = Math.max(0, Math.min(100, start.wind + Math.round(dx / 1.8)));
      const nextVolume = Math.max(0, Math.min(100, start.volume + Math.round(dx / 2.4)));
      updateGesture({ type: "horizontal_wave", windPower: nextWind, volume: nextVolume });
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
          "--flower-scale": gesture.flowerOpen ? 1 : 0.74,
          "--flower-color": flowerColor,
          "--wind-shift": `${gesture.windPower - 35}px`,
          "--wind-opacity": gesture.type === "horizontal_wave" ? Math.min(0.62, 0.18 + gesture.windPower / 180) : 0.16
        } as React.CSSProperties
      }
    >
      <div className="gift-bg" style={{ background: theme.gradient }} />
      <div className="wind-layer" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="data-panel">
        <div>
          <p className="wind-row">
            风力 {windDisplay}
            <button
              className="reset-wind-btn"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => updateGesture({ type: "horizontal_wave", windPower: 50, volume: 58 })}
              type="button"
              aria-label="回到微风"
              title="回到微风"
            >
              ↻
            </button>
          </p>
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
        <SynthBgmButton volume={gesture.volume} />
      </div>

      {showGuide ? (
        <div className="guide-overlay" onPointerDown={(event) => event.stopPropagation()}>
          <div className="guide-card">
            <strong>用触摸唤醒这片花园</strong>
            <p className="hint">阶段 1 使用触摸交互，后续阶段会加入摄像头手势。</p>
            <div className="guide-grid">
              <GuideItem icon="↕" title="上下滑动" text="植物长高或变矮" />
              <GuideItem icon="↔" title="左右滑动" text="改变音量和风力" />
              <GuideItem icon="◌" title="点击花朵" text="开放或闭合" />
              <GuideItem icon="✦" title="双击屏幕" text="整片花园统一换色" />
            </div>
            <button className="primary-btn" onClick={() => setShowGuide(false)} type="button">
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
