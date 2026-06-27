"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BgmPlayer, BgmPresetId, getBgmPreset, playBgmPreset } from "@/lib/systemBgm";

export function SynthBgmButton({
  audioUrl,
  bgmPresetId,
  autoStart = true,
  volume
}: {
  audioUrl?: string;
  bgmPresetId?: string;
  autoStart?: boolean;
  volume: number;
}) {
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [manualVolume, setManualVolume] = useState(80);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const audioRef = useRef<{
    context: AudioContext;
    gain: GainNode;
    oscillators: OscillatorNode[];
    bgmPlayer?: BgmPlayer;
  } | null>(null);
  const mediaRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(volume);
  const manualVolumeRef = useRef(manualVolume);

  const effectiveVolume = useCallback((baseVolume: number, userVolume: number) => {
    return Math.max(0, Math.min(100, Math.round((baseVolume * userVolume) / 100)));
  }, []);

  const updateManualVolume = useCallback((value: string) => {
    setManualVolume(Number(value));
  }, []);

  const displayedVolume = effectiveVolume(volume, manualVolume);
  const muted = !bgmEnabled || displayedVolume === 0 || !playing;
  const buttonLabel = !bgmEnabled ? "无 BGM" : playing ? "音乐播放中" : "播放音乐";

  useEffect(() => {
    volumeRef.current = volume;
    const nextVolume = effectiveVolume(volume, manualVolumeRef.current);
    if (audioRef.current) {
      audioRef.current.gain.gain.setTargetAtTime(nextVolume / 100, audioRef.current.context.currentTime, 0.08);
    }
    if (mediaRef.current) {
      mediaRef.current.volume = nextVolume / 100;
    }
  }, [effectiveVolume, volume]);

  useEffect(() => {
    manualVolumeRef.current = manualVolume;
    const nextVolume = effectiveVolume(volumeRef.current, manualVolume);
    if (audioRef.current) {
      audioRef.current.gain.gain.setTargetAtTime(nextVolume / 100, audioRef.current.context.currentTime, 0.08);
    }
    if (mediaRef.current) {
      mediaRef.current.volume = nextVolume / 100;
    }
  }, [effectiveVolume, manualVolume]);

  const pause = useCallback(() => {
    if (mediaRef.current) {
      mediaRef.current.pause();
      setPlaying(false);
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      setPlaying(false);
      return;
    }

    audio.context.suspend().catch(() => undefined);
    setPlaying(false);
  }, []);

  const dispose = useCallback(() => {
    if (mediaRef.current) {
      mediaRef.current.pause();
      mediaRef.current.src = "";
      mediaRef.current = null;
    }

    const audio = audioRef.current;
    if (!audio) {
      setPlaying(false);
      return;
    }

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
        mediaRef.current.volume = effectiveVolume(volumeRef.current, manualVolumeRef.current) / 100;
        await mediaRef.current.play();
        setBlocked(false);
        setPlaying(true);
        return;
      }

      const media = new Audio(audioUrl);
      media.loop = true;
      media.volume = effectiveVolume(volumeRef.current, manualVolumeRef.current) / 100;
      mediaRef.current = media;
      await media.play();
      setBlocked(false);
      setPlaying(true);
      return;
    }

    if (audioRef.current) {
      if (audioRef.current.context.state === "suspended") {
        await audioRef.current.context.resume();
        setBlocked(false);
        setPlaying(true);
      }
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
    gain.gain.value = effectiveVolume(volumeRef.current, manualVolumeRef.current) / 100;
    gain.connect(context.destination);

    let bgmPlayer: BgmPlayer | undefined;

    if (bgmPresetId) {
      const preset = getBgmPreset(bgmPresetId as BgmPresetId);
      if (preset) {
        bgmPlayer = playBgmPreset(preset, context, gain);
      }
    }

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
      audioRef.current = { context, gain, oscillators: [], bgmPlayer };
    }

    setBlocked(false);
    setPlaying(true);
  }, [audioUrl, bgmPresetId, effectiveVolume]);

  useEffect(() => {
    if (!bgmEnabled || !autoStart) {
      return dispose;
    }

    start().catch(() => {
      setBlocked(true);
      setPlaying(false);
    });
    return dispose;
  }, [autoStart, bgmEnabled, dispose, start]);

  return (
    <div
      className="speaker-control"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <button
        className={`speaker-btn ${muted ? "muted" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          setPanelOpen((open) => !open);
          if (bgmEnabled && !playing) {
            start().catch(() => setBlocked(true));
          }
        }}
        type="button"
        aria-label="音乐控制"
        title={blocked ? "点击播放音乐" : "音乐控制"}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          {muted ? (
            <>
              <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
              <path d="m16 9 4 4m0-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <path
              d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12Zm-2.5-7.93v2.06a6.5 6.5 0 0 1 0 11.74v2.06a8.5 8.5 0 0 0 0-15.86Z"
              fill="currentColor"
            />
          )}
        </svg>
        {buttonLabel}
      </button>
      {panelOpen ? (
        <div className="volume-popover music-popover" onClick={(event) => event.stopPropagation()}>
          <label>
            <span>音量 {manualVolume}%</span>
            <span className="volume-slider-wrap">
              <input
                aria-label="音乐音量"
                className="range volume-range"
                max={100}
                min={0}
                onChange={(event) => updateManualVolume(event.target.value)}
                onInput={(event) => updateManualVolume(event.currentTarget.value)}
                type="range"
                value={manualVolume}
              />
            </span>
          </label>
          <div className="music-popover-actions">
            <button
              className="volume-stop-btn"
              disabled={!bgmEnabled}
              onClick={(event) => {
                event.stopPropagation();
                if (playing) {
                  pause();
                } else {
                  start().catch(() => setBlocked(true));
                }
              }}
              type="button"
            >
              {playing ? "暂停音乐" : "继续播放"}
            </button>
            <button
              className="volume-stop-btn"
              onClick={(event) => {
                event.stopPropagation();
                if (bgmEnabled) {
                  dispose();
                  setBgmEnabled(false);
                } else {
                  setBgmEnabled(true);
                  start().catch(() => setBlocked(true));
                }
              }}
              type="button"
            >
              {bgmEnabled ? "关闭 BGM" : "恢复 BGM"}
            </button>
          </div>
          <button
            className="volume-stop-btn music-popover-close"
            onClick={(event) => {
              event.stopPropagation();
              setPanelOpen(false);
            }}
            type="button"
          >
            收起
          </button>
        </div>
      ) : null}
    </div>
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
