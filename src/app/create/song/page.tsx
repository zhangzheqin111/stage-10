"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { shouldStartFromGuide, startCreationFlow } from "@/lib/creationFlow";
import { GiftDraft, getDraft, saveDraft } from "@/lib/gift";
import { fileToDataUrl, saveLocalDraft } from "@/lib/localGiftStore";
import { MockMusicTrack, parseMockMusicLink, searchMockMusic } from "@/lib/mockMusic";
import { BgmPreset, previewBgmPreset, SYSTEM_BGM_PRESETS } from "@/lib/systemBgm";

type ParseMusicLinkResult =
  | { ok: true; track: MockMusicTrack; message: string }
  | { ok: false; message: string };

const previewDurationMs = 10000;
const maxAudioUploadSize = 10 * 1024 * 1024;

function canUseAudioFile(file: File) {
  const normalizedName = file.name.toLowerCase();
  if (normalizedName.endsWith(".amr") || file.type === "audio/amr" || file.type === "audio/amr-wb") {
    return false;
  }

  return (
    ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a", ""].includes(file.type) ||
    normalizedName.endsWith(".mp3") ||
    normalizedName.endsWith(".wav") ||
    normalizedName.endsWith(".m4a")
  );
}

async function parseMusicLink(url: string): Promise<ParseMusicLinkResult> {
  try {
    const response = await fetch("/api/music/parse-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = (await response.json()) as ParseMusicLinkResult;

    if (response.ok && data.ok) {
      return data;
    }

    return {
      ok: false,
      message: !data.ok ? data.message : "链接暂时解析失败，可以继续选择推荐、上传音频或系统 BGM。"
    };
  } catch {
    const fallback = parseMockMusicLink(url);
    return fallback.ok ? { ok: true, track: fallback.track, message: fallback.message } : fallback;
  }
}

async function searchMusic(keyword: string) {
  try {
    const response = await fetch("/api/music/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword })
    });
    const data = (await response.json()) as { tracks?: MockMusicTrack[] };

    if (response.ok && Array.isArray(data.tracks)) {
      return data.tracks.slice(0, 3);
    }
  } catch {
    // Fall through to local mock data so the song flow always has a usable path.
  }

  return searchMockMusic(keyword).slice(0, 3);
}

export default function SongPage() {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [selectedArtist, setSelectedArtist] = useState("");
  const [linkValue, setLinkValue] = useState("");
  const [linkMessage, setLinkMessage] = useState("粘贴歌曲链接后点击识别。");
  const [resolvedTrack, setResolvedTrack] = useState<MockMusicTrack | null>(null);
  const [keyword, setKeyword] = useState("");
  const [recommendations, setRecommendations] = useState<MockMusicTrack[]>([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadedAudio, setUploadedAudio] = useState<{ title: string; audioUrl: string } | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const previewRef = useRef<{ context: AudioContext; oscillators: OscillatorNode[] } | null>(null);
  const mediaPreviewRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<number | null>(null);
  const bgmPreviewStopRef = useRef<(() => void) | null>(null);

  function persistMusicDraft(nextDraft: GiftDraft) {
    saveDraft(nextDraft);
    saveLocalDraft(nextDraft).catch((err) => {
      console.warn("[song] saveLocalDraft failed", err);
    });
  }

  useEffect(() => {
    if (shouldStartFromGuide()) {
      router.replace("/");
      return;
    }

    // 同步读 localStorage（不再依赖异步 IndexedDB），立刻拿到 draft
    const visibleDraft = getDraft();
    if (visibleDraft.musicSelected) {
      setSelected(visibleDraft.songTitle);
      setSelectedArtist(visibleDraft.artist);
    }
    if (visibleDraft.audioUrl) {
      setUploadedAudio({ title: visibleDraft.songTitle, audioUrl: visibleDraft.audioUrl });
    }
  }, [router]);

  useEffect(() => stopPreview, []);

  function stopPreview() {
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    // 停止系统 BGM 预设试听（新）
    if (bgmPreviewStopRef.current) {
      bgmPreviewStopRef.current();
      bgmPreviewStopRef.current = null;
    }

    if (mediaPreviewRef.current) {
      mediaPreviewRef.current.pause();
      mediaPreviewRef.current.currentTime = 0;
      mediaPreviewRef.current = null;
    }

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

  function playPreview(song: { title: string; artist: string; mood: string; notes: number[] }) {
    stopPreview();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setUploadMessage("当前浏览器暂不支持系统 BGM 试听，但仍可使用该 BGM。");
      return;
    }
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
    context.resume().catch(() => undefined);
    previewTimerRef.current = window.setTimeout(stopPreview, previewDurationMs);
  }

  /**
   * 使用新预设引擎试听系统 BGM（6 种预设音色）。
   */
  function playBgmPreview(preset: BgmPreset) {
    stopPreview();
    bgmPreviewStopRef.current = previewBgmPreset(preset, previewDurationMs);
  }

  async function playUploadedPreview(audioUrl: string) {
    stopPreview();
    const audio = new Audio(audioUrl);
    audio.volume = 0.72;
    mediaPreviewRef.current = audio;
    await audio.play();
    previewTimerRef.current = window.setTimeout(stopPreview, previewDurationMs);
  }

  function playMockPreview(track: MockMusicTrack) {
    playPreview({
      title: track.title,
      artist: track.artist,
      mood: track.mood,
      notes: track.notes
    });
  }

  async function chooseBgm(preset: BgmPreset) {
    console.log("[song] chooseBgm 点击", preset.title);
    const currentDraft = getDraft();
    const nextDraft = {
      ...currentDraft,
      songSourceType: "default" as const,
      musicSelected: true,
      songTitle: preset.title,
      artist: "BloomBeat 系统 BGM",
      bgmPresetId: preset.id,
      audioUrl: undefined
    };
    startCreationFlow();
    setSelected(preset.title);
    setSelectedArtist("BloomBeat 系统 BGM");
    setUploadMessage(`已选择系统 BGM：${preset.title}（${preset.instrument}）。`);
    // 同步写入 localStorage，立即可读
    try {
      persistMusicDraft(nextDraft);
      console.log("[song] saveDraft 成功，localStorage 大小：", window.localStorage.getItem("bloombeat-draft")?.length ?? 0);
    } catch (err) {
      console.error("[song] saveDraft 失败", err);
    }
    try {
      playBgmPreview(preset);
    } catch {
      setUploadMessage(`已选择系统 BGM：${preset.title}，但当前浏览器需要再次点击后才能试听。`);
    }
  }

  async function chooseUploadedAudio(audio: { title: string; audioUrl: string }) {
    const currentDraft = getDraft();
    const nextDraft = {
      ...currentDraft,
      songSourceType: "upload" as const,
      musicSelected: true,
      songTitle: audio.title,
      artist: "用户上传音频",
      audioUrl: audio.audioUrl,
      bgmPresetId: undefined
    };

    startCreationFlow();
    setSelected(audio.title);
    setSelectedArtist("用户上传音频");
    // 同步写入 localStorage（包含 audioUrl data URL）
    persistMusicDraft(nextDraft);
    setUploadMessage("已重新使用上传音频作为背景音乐。");
    playUploadedPreview(audio.audioUrl).catch(() => setUploadMessage("已使用上传音频，但浏览器需要点击页面后才能试听。"));
  }

  async function chooseMockTrack(track: MockMusicTrack, sourceType: "link" | "recommendation") {
    const currentDraft = getDraft();
    const nextDraft = {
      ...currentDraft,
      songSourceType: sourceType,
      musicSelected: true,
      songTitle: track.title,
      artist: `${track.artist} · ${track.platform}`,
      audioUrl: undefined,
      bgmPresetId: undefined
    } as const;

    startCreationFlow();
    setSelected(track.title);
    setSelectedArtist(`${track.artist} · ${track.platform}`);
    if (sourceType === "link") {
      setResolvedTrack(track);
    }
    // 同步写入 localStorage
    persistMusicDraft(nextDraft);
    setUploadMessage(`已选择：${track.title}。`);
    try {
      playMockPreview(track);
    } catch {
      setUploadMessage(`已选择：${track.title}，但当前浏览器需要再次点击后才能试听。`);
    }
  }

  async function handleParseLink() {
    const result = await parseMusicLink(linkValue);
    setLinkMessage(result.message);

    if (!result.ok) {
      setResolvedTrack(null);
      return;
    }

    setResolvedTrack(result.track);
    playMockPreview(result.track);
  }

  function handleSearch(nextKeyword: string) {
    setKeyword(nextKeyword);
    const normalized = nextKeyword.trim();

    if (!normalized) {
      setRecommendations([]);
      return;
    }

    searchMusic(normalized).then(setRecommendations);
  }

  async function handleAudioUpload(file?: File) {
    if (!file) {
      return;
    }

    if (!canUseAudioFile(file)) {
      setUploadMessage("暂不支持手机录音机生成的 AMR 音频，请从文件中选择 mp3 / wav / m4a。");
      return;
    }

    if (file.size > maxAudioUploadSize) {
      setUploadMessage("音频超过 10MB，请压缩或裁剪后重新上传。");
      return;
    }

    setUploadMessage("正在读取音频...");

    try {
      const audioUrl = await fileToDataUrl(file);
      const title = file.name.replace(/\.[^.]+$/, "");
      stopPreview();
      startCreationFlow();
      setUploadedAudio({ title, audioUrl });
      setSelected(title);
      // 同步写入 localStorage（含 audioUrl），保证预览/礼物页能立刻读到
      const currentDraft = getDraft();
      const nextDraft = {
        ...currentDraft,
        songSourceType: "upload",
        musicSelected: true,
        songTitle: title,
        artist: "用户上传音频",
        audioUrl,
        bgmPresetId: undefined
      } as const;
      persistMusicDraft(nextDraft);
      setSelectedArtist("用户上传音频");
      setUploadMessage("音频已保存到礼物草稿，可进入下一步。");
      playUploadedPreview(audioUrl).catch(() => setUploadMessage("音频已保存；浏览器需要点击页面后才能试听。"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      setUploadMessage(`音频读取失败（${msg}），请重新选择一个 10MB 以内的常见音频格式。`);
    }
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <AppHeader step="1 / 3 选择音乐" />
        <section className="section soft-card stack">
          <div>
            <h1 className="page-title">将音乐卡带放进你的礼物盒~</h1>
            <p className="lead">可以通过下列四种方式选一首最想送给 TA 的歌。</p>
          </div>

          <div className="current-choice">
            <span>当前选择</span>
            {selected ? (
              <>
                <strong>{selected}</strong>
                <p className="hint">{selectedArtist}</p>
              </>
            ) : (
              <div className="state-card compact">
                <strong>还没有选定背景歌曲</strong>
                <p className="hint">可以识别链接、搜索推荐、上传本地音频，或直接选择系统 BGM。</p>
              </div>
            )}
          </div>

          <div className="field">
            <label>方式一：QQ 音乐 / 酷狗链接</label>
            <div className="inline-action">
              <input
                className="input"
                onChange={(event) => setLinkValue(event.target.value)}
                placeholder="粘贴 QQ 音乐或酷狗歌曲链接"
                value={linkValue}
              />
              <button className="secondary-btn compact-btn" onClick={handleParseLink} type="button">
                识别
              </button>
            </div>
            <p className="hint">{linkMessage}</p>
            {resolvedTrack ? (
              <div className="music-result">
                <span className="mock-cover" style={{ background: resolvedTrack.coverGradient }} />
                <div>
                  <strong>{resolvedTrack.title}</strong>
                  <p className="hint">
                    {resolvedTrack.artist} · {resolvedTrack.platform}
                  </p>
                  <button className="secondary-btn compact-btn use-track-btn" onClick={() => chooseMockTrack(resolvedTrack, "link")} type="button">
                    使用这首歌
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="field">
            <label>方式二：歌曲推荐</label>
            <input
              className="input"
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="输入歌手名字、场景或想到的一个词"
              value={keyword}
            />
            <p className="hint">若无相关推荐，您可以尝试直接上传音频文件，或使用系统 BGM。</p>
            {keyword.trim() ? (
              recommendations.length > 0 ? (
                <div className="stack">
                  {recommendations.map((track) => (
                    <button
                      className={`option-card music-option ${selected === track.title ? "active" : ""}`}
                      key={track.id}
                      onClick={() => chooseMockTrack(track, "recommendation")}
                      type="button"
                    >
                      <span className="mock-cover small" style={{ background: track.coverGradient }} />
                      <span>
                        <strong>{track.title}</strong>
                        <p className="hint">
                          {track.artist} · {track.platform} · {track.mood}
                        </p>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="state-card compact">
                  <strong>暂时没有匹配的推荐</strong>
                  <p className="hint">可以换一个关键词，或继续上传本地音频 / 选择系统 BGM。</p>
                </div>
              )
            ) : null}
          </div>

          <div className="field">
            <label>方式三：上传本地音频</label>
            <label className="upload-music-box">
              <input
                accept=".mp3,.wav,.m4a"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setUploadFileName(file?.name ?? "");
                  handleAudioUpload(file);
                }}
                type="file"
              />
              <span>{uploadFileName || "点击上传本地音乐文件"}</span>
            </label>
            <p className="hint">支持 mp3 / wav / m4a，文件大小不超过 10MB。</p>
            {uploadMessage ? <p className="hint">{uploadMessage}</p> : null}
            {uploadedAudio ? (
              <div className="music-result">
                <span className="mock-cover uploaded-cover" />
                <div>
                  <strong>{uploadedAudio.title}</strong>
                  <p className="hint">已上传的本地音频</p>
                  <button className="secondary-btn compact-btn use-track-btn" onClick={() => chooseUploadedAudio(uploadedAudio)} type="button">
                    使用该音乐
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="field">
            <span className="field-title">方式四：系统 BGM</span>
            <p className="hint">选择一种音色作为礼物背景音乐。</p>
            <div className="bgm-preset-grid">
              {SYSTEM_BGM_PRESETS.map((preset) => (
                <button
                  className={`bgm-preset-card ${selected === preset.title ? "active" : ""}`}
                  key={preset.id}
                  onClick={() => chooseBgm(preset)}
                  type="button"
                >
                  <span className="bgm-preset-cover" style={{ background: preset.colorGradient }}>
                    <span className="bgm-preset-play-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M8 5v14l11-7z" fill="currentColor" />
                      </svg>
                    </span>
                  </span>
                  <span className="bgm-preset-body">
                    <strong>{preset.title}</strong>
                    <span className="bgm-preset-tags">
                      <span className="bgm-preset-tag">{preset.instrument}</span>
                      <span className="bgm-preset-tag bgm-preset-tag--mood">{preset.mood}</span>
                    </span>
                  </span>
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
