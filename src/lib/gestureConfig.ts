// 阶段 4 真机调参：把 GiftExperience 中散落的阈值集中到一处。
// 每个字段都标注了"调大 / 调小"会带来的体感变化，调参面板会用同样的字段名。
// 任何对识别体感的微调，都应改这里而不是改 GiftExperience 内部。

export type GestureConfig = {
  // 掌心上移 / 下移 → 高度
  // heightOrigin.y - palm.y 越大代表手越靠上；乘 185 把它映射成 0-100 的高度变化
  // 调大：手轻微抬起就明显长高（更敏感，但也更容易被相机光线抖动干扰）
  // 调小：必须把手抬得很高花朵才长高（更稳，但响应迟钝）
  heightDisplacementGain: number;
  // 垂直方向瞬时速度对高度的额外贡献。乘 170。
  // 调大：挥手式上下摆动会让花朵额外"甩"一下
  // 调小：完全靠绝对位置决定高度
  heightVelocityGain: number;
  // 高度每帧最大变化（防跳变）。22 表示相邻帧高度不会跳超过 22。
  // 调大：动作更跟手但会跳变
  // 调小：动作更平滑但跟手感会"糊"
  heightMaxStep: number;
  // 高度归一化基准：palm.y < 0.78 → 顶，> 0.78-0.54 → 0
  // 调小 0.78：识别范围更靠上
  // 调大 0.78：识别范围更靠下
  heightReferenceTopY: number;
  heightReferenceRange: number;

  // 左右信号：掌心横向速度 + 手掌倾斜 + 指尖横摆 三个分量加权
  // movementWind 的水平速度系数 760：手横向划过时贡献多少风力
  // 调大：挥手一次风力变化剧烈
  // 调小：必须大幅挥手才改变风力
  horizontalVelocityGain: number;
  // movementWind 加 palm.x - 0.5 的 12 倍（手在画面左右半边的稳定偏移）
  // 调大：手只要在画面左 / 右侧就持续吹风
  // 调小：完全靠运动产生风力，位置不再影响
  horizontalOffsetGain: number;
  // palmRollWind 把 0-1 的倾斜量映射到 0-100 的风力，乘 74
  // 调大：手腕轻晃就有大风
  // 调小：必须夸张倾斜才有风
  palmRollGain: number;
  // fingertipSwingScore 用指尖横摆和掌心 X 的差乘以 52
  // 调大：指尖横摆明显放大风力
  // 调小：指横摆作用弱，主要靠掌心位置
  fingertipSwingGain: number;
  // 高度越靠近顶端 / 底端，roll / swing 权重提升的系数 0.05 / 0.08
  // 调大：高位 / 低位时倾斜 / 指尖横摆的权重更突出
  // 调小：所有位置权重均衡
  edgeRollWeightBoost: number;
  edgeSwingWeightBoost: number;
  // 高位 / 低位时整体风力放大 0.16
  // 调大：极端位置风力更夸张
  // 调小：极端位置仍温和
  edgeWindAmplify: number;
  // 风力每帧最大变化。24
  windMaxStep: number;

  // 张开 / 闭合：fingerSpreadScore = (指尖到掌心平均距离) / palmWidth
  // > 1.28 视为张开候选
  // 调大：必须把手张得非常开才识别为 open_hand（更准，但难触发）
  // 调小：手指稍微分开就识别为 open_hand（容易触发，但可能误判）
  openSpreadThreshold: number;
  // 开合候选确认时长（毫秒）。200：候选值保持 200ms 才更新
  // 调大：开合反应更慢但更稳
  // 调小：开合更跟手但可能闪烁
  openDebounceMs: number;
  // 开合过渡期间对高度 / 风力的衰减 0.7 / 0.3（保留 70% 旧值）
  // 调大：开合时上下 / 左右信号衰减更狠
  // 调小：开合时仍允许上下 / 左右信号
  openTransitionKeep: number;

  // 捏合：拇指尖 (4) 和食指尖 (8) 距离 / palmWidth
  // < 0.42 视为捏合候选
  // 调大：必须真正贴近才识别捏合
  // 调小：稍近就触发捏合
  pinchTriggerRatio: number;
  // > 0.58 视为已松开（重新允许下次捏合）
  // 调大：必须大幅张开才能再次捏合（防误触强）
  // 调小：稍微松开就允许下次捏合
  pinchReleaseRatio: number;
  // 两次捏合之间最短间隔（毫秒）。580
  // 调大：连续捏合不会反复换色
  // 调小：可以快速连捏换色
  pinchCooldownMs: number;

  // 双手融合：方向差阈值 24
  // 调大：更容易触发双手融合
  // 调小：方向稍不一致就退回主手
  twoHandDirectionTolerance: number;
  // 双手融合：高度差阈值 34
  // 调大：高度差较大仍可融合
  // 调小：双手高度必须接近才能融合
  twoHandHeightTolerance: number;
  // 触发融合需要连续满足的帧数。2
  // 调大：更稳定但反应慢
  // 调小：反应快但容易闪烁
  fusionStreakFrames: number;

  // 掌心坐标平滑系数 0.38 / 0.62
  // 调大 0.62：更跟手但抖动多
  // 调小 0.38：更平滑但跟手感弱
  palmSmoothKeep: number;

  // 上下 / 左右手势识别：移动阈值 0.009 与 0.78 比例
  // 调大：必须大幅移动才识别为挥动
  // 调小：轻微移动就识别为挥动
  movePixelThreshold: number;
  moveYRatio: number;
  // 帧间最大高度跳变 8（用于判定 vertical_wave）
  moveHeightDeltaThreshold: number;
  // 风力偏离中位 9 视为 horizontal_wave
  moveWindDeltaThreshold: number;

  // 250ms 丢帧保持：找不到手时仍按上一帧继续
  // 调大：手短暂离开画面后仍继续控制（但可能误判）
  // 调小：手离开立即重置
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
    // Ignore restricted storage; user can still tune during this session via debug panel state.
  }
}

export function resetGestureConfig() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

// 真机诊断采样器：把每帧的关键数据累计到一个环形缓冲，供调试面板展示。
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
