"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getDraft, saveDraft } from "@/lib/gift";
import { fileToDataUrl, getLocalDraft, saveLocalDraft } from "@/lib/localGiftStore";

const bgms = [
  { title: "晨光花园", artist: "BloomBeat 系统 BGM", mood: "轻柔、明亮", notes: [261.63, 329.63, 392] },
  { title: "晚风信笺", artist: "BloomBeat 系统 BGM", mood: "安静、温柔", notes: [220, 293.66, 349.23] },
  { title: "星光音乐盒", artist: "BloomBeat 系统 BGM", mood: "梦幻、礼物感", notes: [329.63, 392, 523.25] }
];

export default function SongPage() {
  const [selected, setSelected] = useState(bgms[0].title);
  const [uploadMessage, setUploadMessage] = useState("");
  const previewRef = useRef<{ context: AudioContext; oscillators: OscillatorNode[] } | null>(null);

  useEffect(() => {
    getLocalDraft()
      .then((draft) => setSelected((draft ?? getDraft()).songTitle))
      .catch(() => setSelected(getDraft().songTitle));
  }, []);

  useEffect(() => stopPreview, []);

  function stopPreview() {
    const preview = previewRef.current;
    if (!preview) {
      return;
    }

    preview.oscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // Preview may already be stopped by cleanup.
      }
    });
    preview.context.close();
    previewRef.current = null;
  }

  function playPreview(song: (typeof bgms)[number]) {
    stopPreview();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.value = 0.05;
    gain.connect(context.destination);

    const oscillators = song.notes.map((note, index) => {
      const oscillator = context.createOscillator();
      const noteGain = context.createGain();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = note;
      noteGain.gain.value = index === 0 ? 0.48 : 0.22;
      oscillator.connect(noteGain);
      noteGain.connect(gain);
      oscillator.start();
      return oscillator;
    });

    previewRef.current = { context, oscillators };
    window.setTimeout(stopPreview, 2400);
  }

  async function chooseSong(song: (typeof bgms)[number]) {
    const currentDraft = (await getLocalDraft()) ?? getDraft();
    const nextDraft = { ...currentDraft, songSourceType: "default" as const, songTitle: song.title, artist: song.artist, audioUrl: undefined };
    setSelected(song.title);
    saveDraft(nextDraft);
    saveLocalDraft(nextDraft);
    setUploadMessage("");
    playPreview(song);
  }

  async function handleAudioUpload(file?: File) {
    if (!file) {
      return;
    }

    if (!["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac"].includes(file.type)) {
      setUploadMessage("请上传 mp3 / wav / m4a 格式音频。");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadMessage("音频超过 15MB，请更换文件或选择默认 BGM。");
      return;
    }

    const audioUrl = await fileToDataUrl(file);
    const title = file.name.replace(/\.[^.]+$/, "");
    setSelected(title);
    const currentDraft = (await getLocalDraft()) ?? getDraft();
    const nextDraft = {
      ...currentDraft,
      songSourceType: "upload",
      songTitle: title,
      artist: "用户上传音频",
      audioUrl
    } as const;
    saveDraft({ songSourceType: "upload", songTitle: title, artist: "用户上传音频" });
    await saveLocalDraft(nextDraft);
    setUploadMessage("音频已保存到本地礼物草稿，生成链接后可在本机新窗口打开。");
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <AppHeader step="1 / 3 选择音乐" />
        <section className="section soft-card stack">
          <div>
            <h1>选择一首送给 TA 的歌</h1>
            <p className="lead">可上传自己的音频；如果暂时没有音频，也可以试听并选择系统 BGM。</p>
          </div>

          <div className="field">
            <label>QQ 音乐 / 酷狗链接</label>
            <input className="input" placeholder="阶段 3 开放：粘贴歌曲链接" disabled />
            <p className="hint">当前阶段不会连接真实音乐 API，避免影响静态 MVP 稳定性。</p>
          </div>

          <div className="field">
            <label>上传本地音频</label>
            <input
              className="input"
              accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4"
              onChange={(event) => handleAudioUpload(event.target.files?.[0])}
              type="file"
            />
            <p className="hint">支持 mp3 / wav / m4a，阶段 2 限制 15MB 以内。</p>
            {uploadMessage ? <p className="hint">{uploadMessage}</p> : null}
          </div>

          <div className="field">
            <span className="field-title">若无音频，可选系统 BGM</span>
            <div className="stack">
              {bgms.map((song) => (
                <button
                  className={`option-card ${selected === song.title ? "active" : ""}`}
                  key={song.title}
                  onClick={() => chooseSong(song)}
                  type="button"
                >
                  <strong>{song.title}</strong>
                  <p className="hint">{song.mood}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="footer-actions">
            <Link className="secondary-btn" href="/">
              返回
            </Link>
            <Link className="primary-btn" href="/create/content">
              下一步
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
