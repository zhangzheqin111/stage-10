/**
 * 系统 BGM 预设库 — 6 种音色/情绪的 Web Audio 合成预设。
 * 每种预设通过不同的振荡器类型、ADSR 包络、和弦/琶音模式来实现独特听感。
 */

export type BgmPresetId = "serenity" | "dreamscape" | "bright" | "warmth" | "starry" | "after-rain";

export interface BgmSecondLayer {
  waveform: OscillatorType;
  detuneCents: number;
  gainRatio: number; // 相对主层的增益比
}

export interface BgmPreset {
  id: BgmPresetId;
  title: string;
  mood: string;
  description: string;
  instrument: string;
  colorGradient: string;
  colorPrimary: string;
  notes: number[]; // 频率 (Hz)
  waveform: OscillatorType;
  attack: number; // 秒
  decay: number;
  sustain: number; // 0-1 增益系数
  release: number;
  arpeggiate: boolean;
  arpeggioDelay: number; // 秒，每个音符之间的间隔
  detuneCents: number; // 轻微失谐
  secondLayer?: BgmSecondLayer;
  masterVolume: number; // 0-1
}

export const SYSTEM_BGM_PRESETS: BgmPreset[] = [
  {
    id: "serenity",
    title: "静谧",
    mood: "安静、放松、冥想",
    description: "缓慢铺展的柔和铺垫音色，适合安静时刻。",
    instrument: "柔和铺垫",
    colorGradient: "linear-gradient(135deg, #b8d4e3, #e8e2f4)",
    colorPrimary: "#8db5cf",
    notes: [261.63, 329.63, 392.0, 493.88], // C4 E4 G4 B4
    waveform: "sine",
    attack: 1.8,
    decay: 0.5,
    sustain: 0.7,
    release: 2.5,
    arpeggiate: false,
    arpeggioDelay: 0,
    detuneCents: 4,
    secondLayer: {
      waveform: "triangle",
      detuneCents: 7,
      gainRatio: 0.45
    },
    masterVolume: 0.065
  },
  {
    id: "dreamscape",
    title: "梦境",
    mood: "梦幻、礼物感、治愈",
    description: "高音区八音盒般的清脆琶音，像星光洒落。",
    instrument: "八音盒",
    colorGradient: "linear-gradient(135deg, #d4b8e8, #f0d4e8)",
    colorPrimary: "#c4a0d8",
    notes: [523.25, 659.25, 783.99, 1046.5], // C5 E5 G5 C6
    waveform: "triangle",
    attack: 0.02,
    decay: 0.6,
    sustain: 0.08,
    release: 0.4,
    arpeggiate: true,
    arpeggioDelay: 0.18, // 180ms between notes
    detuneCents: 2,
    masterVolume: 0.07
  },
  {
    id: "bright",
    title: "明亮",
    mood: "鼓励、感谢、开心",
    description: "明亮清晰的钢琴感音色，给人积极向上的感觉。",
    instrument: "明亮钢琴",
    colorGradient: "linear-gradient(135deg, #ffe4b0, #fff8e8)",
    colorPrimary: "#f0c860",
    notes: [261.63, 329.63, 392.0, 523.25], // C4 E4 G4 C5
    waveform: "sine",
    attack: 0.04,
    decay: 0.3,
    sustain: 0.4,
    release: 0.8,
    arpeggiate: false,
    arpeggioDelay: 0,
    detuneCents: 1,
    secondLayer: {
      waveform: "triangle",
      detuneCents: -3,
      gainRatio: 0.55
    },
    masterVolume: 0.06
  },
  {
    id: "warmth",
    title: "温暖",
    mood: "陪伴、温馨、念旧",
    description: "丰富温暖的铺垫音色，像壁炉旁的舒适感。",
    instrument: "温暖铺垫",
    colorGradient: "linear-gradient(135deg, #e8c4a0, #f0d8c4)",
    colorPrimary: "#d4a878",
    notes: [174.61, 220.0, 261.63, 329.63], // F3 A3 C4 E4
    waveform: "sawtooth",
    attack: 1.2,
    decay: 0.4,
    sustain: 0.65,
    release: 2.0,
    arpeggiate: false,
    arpeggioDelay: 0,
    detuneCents: 5,
    secondLayer: {
      waveform: "sine",
      detuneCents: -4,
      gainRatio: 0.6
    },
    masterVolume: 0.045
  },
  {
    id: "starry",
    title: "星空",
    mood: "梦幻、仰望、浪漫",
    description: "高音区风铃般闪烁的音符，像仰望星空。",
    instrument: "风铃",
    colorGradient: "linear-gradient(135deg, #1a1a3e, #3d3d8e)",
    colorPrimary: "#5c5cba",
    notes: [523.25, 783.99, 1046.5, 1318.51], // C5 G5 C6 E6
    waveform: "sine",
    attack: 0.01,
    decay: 1.4,
    sustain: 0.02,
    release: 0.8,
    arpeggiate: true,
    arpeggioDelay: 0.22,
    detuneCents: 8,
    masterVolume: 0.05
  },
  {
    id: "after-rain",
    title: "雨后",
    mood: "清新、希望、宁静",
    description: "干净清脆的拨弦感音色，像雨后初晴的清新。",
    instrument: "拇指琴",
    colorGradient: "linear-gradient(135deg, #c8e8d4, #e8f8ec)",
    colorPrimary: "#78c898",
    notes: [293.66, 369.99, 440.0, 587.33], // D4 F#4 A4 D5
    waveform: "sine",
    attack: 0.01,
    decay: 0.25,
    sustain: 0.05,
    release: 0.3,
    arpeggiate: false,
    arpeggioDelay: 0,
    detuneCents: 2,
    secondLayer: {
      waveform: "triangle",
      detuneCents: 5,
      gainRatio: 0.3
    },
    masterVolume: 0.07
  }
];

export function getBgmPreset(id: BgmPresetId): BgmPreset | undefined {
  return SYSTEM_BGM_PRESETS.find((p) => p.id === id);
}

export type BgmPlayer = {
  stop: () => void;
};

/**
 * 在给定的 AudioContext 和输出节点上播放一个系统 BGM 预设。
 * 返回一个 stop 函数用于停止播放并释放资源。
 *
 * @param preset 要播放的预设
 * @param context 共享的 AudioContext
 * @param destination 输出节点（通常是 context.destination 或一个 GainNode）
 * @returns { stop } 停止播放并清理
 */
export function playBgmPreset(
  preset: BgmPreset,
  context: AudioContext,
  destination: AudioNode
): BgmPlayer {
  const masterGain = context.createGain();
  masterGain.gain.value = preset.masterVolume;

  // 低通滤波器：切除高频毛刺，让合成音色更温暖柔和
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 2800;  // 截止频率 2800Hz，保留中频温暖，切除尖锐谐波
  lowpass.Q.value = 0.6;           // 温和斜率，不做共振峰

  masterGain.connect(lowpass);
  lowpass.connect(destination);

  const oscillators: OscillatorNode[] = [];
  const gainNodes: GainNode[] = [];

  function createVoice(
    frequency: number,
    waveform: OscillatorType,
    detune: number,
    gainMultiplier: number,
    startOffset: number,
    randomDetune: number
  ) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = waveform;
    osc.frequency.value = frequency;
    osc.detune.value = detune + randomDetune;

    const now = context.currentTime + startOffset;
    // ADSR 包络
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainMultiplier, now + preset.attack);
    gain.gain.linearRampToValueAtTime(
      gainMultiplier * preset.sustain,
      now + preset.attack + preset.decay
    );

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    oscillators.push(osc);
    gainNodes.push(gain);
  }

  // 为每个音符创建声音
  preset.notes.forEach((freq, i) => {
    const startOffset = preset.arpeggiate ? i * preset.arpeggioDelay : 0;
    // 交替失谐方向以获得更丰富的声音
    const detuneSign = i % 2 === 0 ? 1 : -1;
    const detune = preset.detuneCents * detuneSign;
    // 每层音色加 ±3 分随机微调，制造自然合唱感
    const randomDetuneA = (Math.random() - 0.5) * 6;
    const randomDetuneB = preset.secondLayer ? (Math.random() - 0.5) * 6 : 0;

    // 主音色层
    createVoice(freq, preset.waveform, detune, 1, startOffset, randomDetuneA);

    // 第二音色层（如果存在）
    if (preset.secondLayer) {
      createVoice(
        freq,
        preset.secondLayer.waveform,
        detuneSign * preset.secondLayer.detuneCents,
        preset.secondLayer.gainRatio,
        startOffset,
        randomDetuneB
      );
    }
  });

  const totalDuration =
    preset.attack +
    preset.decay +
    (preset.arpeggiate ? (preset.notes.length - 1) * preset.arpeggioDelay : 0);

  function stop() {
    const now = context.currentTime;
    // 对所有增益节点应用释放包络
    gainNodes.forEach((g) => {
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setTargetAtTime(0.0001, now, preset.release);
      } catch {
        // 可能已被 stop
      }
    });

    // 在释放时间后停止振荡器并断开
    const releaseMs = preset.release * 1000 + 100;
    const timeout = window.setTimeout(() => {
      oscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // 可能已停止
        }
      });
      try {
        masterGain.disconnect();
        lowpass.disconnect();
      } catch {
        // ignore
      }
    }, releaseMs);

    // 存储 timeout 以便取消（虽然当前不需要）
    return timeout;
  }

  return { stop };
}

/**
 * 创建一次性的系统 BGM 试听。
 * 适用于选歌页的试听功能——创建独立的 AudioContext，播放指定时长后自动停止。
 *
 * @param preset 预设
 * @param durationMs 试听时长（毫秒），默认 10000
 * @returns 停止函数
 */
export function previewBgmPreset(preset: BgmPreset, durationMs = 10000): () => void {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    return () => {};
  }

  const context = new AudioContextClass() as AudioContext;
  const player = playBgmPreset(preset, context, context.destination);
  context.resume().catch(() => undefined);

  const timer = window.setTimeout(() => {
    player.stop();
    window.setTimeout(() => {
      try {
        context.close();
      } catch {
        // 可能已关闭
      }
    }, preset.release * 1000 + 150);
  }, durationMs);

  return () => {
    window.clearTimeout(timer);
    player.stop();
    window.setTimeout(() => {
      try {
        context.close();
      } catch {
        // ignore
      }
    }, preset.release * 1000 + 150);
  };
}
