"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function SynthBgmButton({ audioUrl, autoStart = true, volume }: { audioUrl?: string; autoStart?: boolean; volume: number }) {
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const audioRef = useRef<{
    context: AudioContext;
    gain: GainNode;
    oscillators: OscillatorNode[];
  } | null>(null);
  const mediaRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current) {
      audioRef.current.gain.gain.setTargetAtTime(volume / 1000, audioRef.current.context.currentTime, 0.08);
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
    const context = new AudioContextClass();
    await context.resume();

    const gain = context.createGain();
    gain.gain.value = volumeRef.current / 1000;
    gain.connect(context.destination);

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
    setBlocked(false);
    setPlaying(true);
  }, [audioUrl]);

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
      <span className="speaker-shape" />
    </button>
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
