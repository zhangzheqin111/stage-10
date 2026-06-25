"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BgmPlayer, BgmPresetId, getBgmPreset, playBgmPreset } from "@/lib/systemBgm";

export function SynthBgmButton({ audioUrl, bgmPresetId, autoStart = true, volume }: { audioUrl?: string; bgmPresetId?: string; autoStart?: boolean; volume: number }) {
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const audioRef = useRef<{
    context: AudioContext;
    gain: GainNode;
    oscillators: OscillatorNode[];
    bgmPlayer?: BgmPlayer;
  } | null>(null);
  const mediaRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current) {
      audioRef.current.gain.gain.setTargetAtTime(volume / 100, audioRef.current.context.currentTime, 0.08);
    }
    if (mediaRef.current) {
      mediaRef.current.volume = volume / 100;
    }
  }, [volume]);

  const stop = useCallback(() => {
    if (mediaRef.current) {
      mediaRef.current.pause();
      mediaRef.current.currentTime = 0;
      mediaRef.current = null;
      setPlaying(false);
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      setPlaying(false);
      return;
    }

    // 停止预设 BGM
    if (audio.bgmPlayer) {
      audio.bgmPlayer.stop();
    }

    const now = audio.context.currentTime;
    audio.gain.gain.cancelScheduledValues(now);
    audio.gain.gain.setTargetAtTime(0.0001, now, 0.03);
    window.setTimeout(() => {
      audio.oscillators.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {
          // The oscillator may already be stopped when React cleans up.
        }
      });
      audio.context.close();
    }, 80);

    audioRef.current = null;
    setPlaying(false);
  }, []);

  const start = useCallback(async () => {
    if (audioUrl) {
      if (mediaRef.current) {
        return;
      }

      const media = new Audio(audioUrl);
      media.loop = true;
      media.volume = volumeRef.current / 100;
      mediaRef.current = media;
      await media.play();
      setBlocked(false);
      setPlaying(true);
      return;
    }

    if (audioRef.current) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setBlocked(true);
      setPlaying(false);
      return;
    }
    const context = new AudioContextClass();
    await context.resume();

    const gain = context.createGain();
    gain.gain.value = volumeRef.current / 100;
    gain.connect(context.destination);

    let bgmPlayer: BgmPlayer | undefined;

    // 尝试加载预设 BGM
    if (bgmPresetId) {
      const preset = getBgmPreset(bgmPresetId as BgmPresetId);
      if (preset) {
        bgmPlayer = playBgmPreset(preset, context, gain);
      }
    }

    // 兜底：如果没预设，播放默认四音和弦
    if (!bgmPlayer) {
      const notes = [261.63, 329.63, 392, 523.25];
      const oscillators = notes.map((note, index) => {
        const oscillator = context.createOscillator();
        const noteGain = context.createGain();
        oscillator.type = index === 0 ? "sine" : "triangle";
        oscillator.frequency.value = note;
        noteGain.gain.value = index === 0 ? 0.32 : 0.12;
        oscillator.connect(noteGain);
        noteGain.connect(gain);
        oscillator.start();
        return oscillator;
      });

      audioRef.current = { context, gain, oscillators };
    } else {
      // 预设模式下仍需创建振荡器数组以避免 stop 时出错
      audioRef.current = { context, gain, oscillators: [], bgmPlayer };
    }

    setBlocked(false);
    setPlaying(true);
  }, [audioUrl, bgmPresetId]);

  useEffect(() => {
    if (!autoStart) {
      return stop;
    }

    start().catch(() => {
      setBlocked(true);
      setPlaying(false);
    });
    return stop;
  }, [autoStart, start, stop]);

  return (
    <button
      className={`speaker-btn ${playing ? "" : "muted"}`}
      onClick={(event) => {
        event.stopPropagation();
        if (playing) {
          stop();
          return;
        }
        start().catch(() => setBlocked(true));
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      type="button"
      aria-label={playing ? "静音" : "播放音乐"}
      title={playing ? "静音" : blocked ? "点击播放" : "播放音乐"}
    >
      {playing ? (
        <>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12Zm-2.5-7.93v2.06a6.5 6.5 0 0 1 0 11.74v2.06a8.5 8.5 0 0 0 0-15.86Z"
              fill="currentColor"
            />
          </svg>
          音乐
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M4 9v6h4l5 4V5L8 9H4Zm15.7 3 2.15-2.15-1.4-1.4L18 10.6l-2.45-2.15-1.4 1.4L16.3 12l-2.15 2.15 1.4 1.4L18 13.4l2.45 2.15 1.4-1.4L19.7 12Z"
              fill="currentColor"
            />
          </svg>
          静音
        </>
      )}
    </button>
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
