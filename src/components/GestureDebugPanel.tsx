"use client";

import { useEffect, useState } from "react";
import { defaultGestureConfig, GestureConfig, loadGestureConfig, resetGestureConfig, saveGestureConfig } from "@/lib/gestureConfig";

type Field = {
  key: keyof GestureConfig;
  label: string;
  step: number;
  min: number;
  max: number;
};

const fields: Field[] = [
  { key: "heightDisplacementGain", label: "高度位移系数", step: 5, min: 80, max: 320 },
  { key: "heightVelocityGain", label: "高度速度系数", step: 5, min: 60, max: 320 },
  { key: "heightMaxStep", label: "高度每帧最大变化", step: 1, min: 5, max: 60 },
  { key: "horizontalVelocityGain", label: "横向速度系数", step: 20, min: 200, max: 1500 },
  { key: "horizontalOffsetGain", label: "横向位置系数", step: 1, min: 0, max: 40 },
  { key: "palmRollGain", label: "手掌倾斜系数", step: 4, min: 20, max: 160 },
  { key: "fingertipSwingGain", label: "指尖横摆系数", step: 4, min: 0, max: 120 },
  { key: "windMaxStep", label: "风力每帧最大变化", step: 1, min: 5, max: 60 },
  { key: "openSpreadThreshold", label: "张开判定阈值", step: 0.04, min: 0.9, max: 1.8 },
  { key: "openDebounceMs", label: "张开确认时长(ms)", step: 20, min: 60, max: 600 },
  { key: "pinchTriggerRatio", label: "捏合触发阈值", step: 0.02, min: 0.2, max: 0.7 },
  { key: "pinchReleaseRatio", label: "捏合释放阈值", step: 0.02, min: 0.3, max: 0.9 },
  { key: "pinchCooldownMs", label: "捏合冷却(ms)", step: 20, min: 200, max: 1500 },
  { key: "twoHandDirectionTolerance", label: "双手方向差阈值", step: 1, min: 5, max: 60 },
  { key: "twoHandHeightTolerance", label: "双手高度差阈值", step: 1, min: 10, max: 80 },
  { key: "fusionStreakFrames", label: "融合确认帧数", step: 1, min: 1, max: 8 },
  { key: "palmSmoothKeep", label: "掌心平滑保留(0-1)", step: 0.02, min: 0.1, max: 0.8 },
  { key: "movePixelThreshold", label: "挥动判定阈值", step: 0.002, min: 0.002, max: 0.04 },
  { key: "moveYRatio", label: "上下/左右判定比", step: 0.04, min: 0.4, max: 1.6 },
  { key: "lostHandHoldMs", label: "丢帧保持(ms)", step: 20, min: 60, max: 800 }
];

export type GestureDebugProps = {
  config: GestureConfig;
  onChange: (next: Partial<GestureConfig>) => void;
  // 实时运行时采样：最近 30 帧，每帧 { hands, fps, pinchRatio, openSpread, height, wind, fusion, time }
  samples: Array<{ time: number; hands: number; fps: number; pinchRatio: number; openSpread: number; height: number; wind: number; fusion: "fuse" | "primary" }>;
  // 阶段提示：例如 "首帧延迟 1240ms" "已识别 30 帧"
  diagnosticHint: string;
  // 是否启用：只在摄像头模式显示
  visible: boolean;
};

export function GestureDebugPanel({ config, onChange, samples, diagnosticHint, visible }: GestureDebugProps) {
  const [expanded, setExpanded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!visible) {
    return null;
  }

  const recent = samples.slice(-30);
  const last = recent[recent.length - 1];
  const averageFps = recent.length
    ? Math.round(recent.reduce((sum, item) => sum + item.fps, 0) / recent.length)
    : 0;
  const handCounts = recent.reduce<Record<string, number>>((acc, item) => {
    acc[String(item.hands)] = (acc[String(item.hands)] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="gesture-debug-panel" aria-label="手势调试面板">
      <button
        className="gesture-debug-toggle"
        onClick={(event) => {
          event.stopPropagation();
          setExpanded((value) => !value);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        调参 {expanded ? "▾" : "▴"}
      </button>
      {expanded ? (
        <div className="gesture-debug-body" onPointerDown={(event) => event.stopPropagation()}>
          <p className="hint">实时</p>
          <div className="gesture-debug-row">
            <span>FPS {averageFps}</span>
            <span>手数 {last?.hands ?? 0}</span>
            <span>融合 {last?.fusion === "fuse" ? "双手" : "单手"}</span>
          </div>
          <div className="gesture-debug-row">
            <span>捏合 {last ? last.pinchRatio.toFixed(2) : "-"}</span>
            <span>张开 {last ? last.openSpread.toFixed(2) : "-"}</span>
          </div>
          <div className="gesture-debug-row">
            <span>高度 {last?.height ?? 0}</span>
            <span>风力 {last?.wind ?? 0}</span>
          </div>
          <p className="hint">最近 30 帧手数分布</p>
          <div className="gesture-debug-bars">
            {[0, 1, 2].map((count) => {
              const value = handCounts[String(count)] ?? 0;
              const heightPct = recent.length ? (value / recent.length) * 100 : 0;
              return (
                <div className="gesture-debug-bar" key={count}>
                  <span>{count}</span>
                  <i style={{ height: `${heightPct}%` }} />
                  <small>{value}</small>
                </div>
              );
            })}
          </div>
          <p className="hint">{diagnosticHint || "等待首帧..."}</p>
          <p className="hint">阈值（拖动滑块即时生效）</p>
          <div className="gesture-debug-fields">
            {fields.map((field) => {
              const value = Number(config[field.key]);
              return (
                <label className="gesture-debug-field" key={field.key}>
                  <span>{field.label}</span>
                  <input
                    max={field.max}
                    min={field.min}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      onChange({ [field.key]: next } as Partial<GestureConfig>);
                    }}
                    step={field.step}
                    type="range"
                    value={Number.isFinite(value) ? value : defaultGestureConfig[field.key]}
                  />
                  <strong>{value.toFixed(field.step >= 1 ? 0 : 2)}</strong>
                </label>
              );
            })}
          </div>
          <div className="gesture-debug-actions">
            <button
              className="secondary-btn compact-btn"
              onClick={(event) => {
                event.stopPropagation();
                onChange(defaultGestureConfig);
                resetGestureConfig();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              type="button"
            >
              恢复默认
            </button>
            <span className="hint">{hydrated ? "已自动保存" : "未挂载"}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function useGestureConfigState() {
  const [config, setConfig] = useState<GestureConfig>(defaultGestureConfig);

  useEffect(() => {
    setConfig(loadGestureConfig());
  }, []);

  function update(partial: Partial<GestureConfig>) {
    setConfig((current) => {
      const next = { ...current, ...partial };
      saveGestureConfig(next);
      return next;
    });
  }

  return { config, update };
}
