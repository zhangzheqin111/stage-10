"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { shouldStartFromGuide, startCreationFlow } from "@/lib/creationFlow";
import { getDraft, saveDraft } from "@/lib/gift";
import { fileToDataUrl, getLocalDraft, saveLocalDraft } from "@/lib/localGiftStore";
import { MockMusicTrack, parseMockMusicLink, searchMockMusic } from "@/lib/mockMusic";

type ParseMusicLinkResult =
  | { ok: true; track: MockMusicTrack; message: string }
  | { ok: false; message: string };

const bgms = [
  { title: "晨光花园", artist: "BloomBeat 系统 BGM", mood: "轻柔、明亮", notes: [261.63, 329.63, 392] },
  { title: "晚风信笺", artist: "BloomBeat 系统 BGM", mood: "安静、温柔", notes: [220, 293.66, 349.23] },
  { title: "星光音乐盒", artist: "BloomBeat 系统 BGM", mood: "梦幻、礼物感", notes: [329.63, 392, 523.25] }
];

const previewDurationMs = 10000;

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

  useEffect(() => {
    if (shouldStartFromGuide()) {
      router.replace("/");
      return;
    }

    getLocalDraft()
      .then((draft) => {
        const visibleDraft = draft ?? getDraft();

        if (visibleDraft.musicSelected) {
          setSelected(visibleDraft.songTitle);
          setSelectedArtist(visibleDraft.artist);
        }
        if (visibleDraft.audioUrl) {
          setUploadedAudio({ title: visibleDraft.songTitle, audioUrl: visibleDraft.audioUrl });
        }
      })
      .catch(() => {
        const nextDraft = getDraft();
        if (nextDraft.musicSelected) {
          setSelected(nextDraft.songTitle);
          setSelectedArtist(nextDraft.artist);
        }
      });
  }, [router]);

  useEffect(() => stopPreview, []);

  function stopPreview() {
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
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

  function playPreview(song: (typeof bgms)[number]) {
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

  async function chooseSong(song: (typeof bgms)[number]) {
    const currentDraft = getDraft();
    const nextDraft = {
      ...currentDraft,
      songSourceType: "default" as const,
      musicSelected: true,
      songTitle: song.title,
      artist: song.artist,
      audioUrl: undefined
    };
    startCreationFlow();
    setSelected(song.title);
    setSelectedArtist(song.artist);
    setUploadMessage(`已选择系统 BGM：${song.title}。`);
    saveDraft(nextDraft);
    void getLocalDraft().then((draft) => saveLocalDraft({ ...(draft ?? nextDraft), ...nextDraft }));
    try {
      playPreview(song);
    } catch {
      setUploadMessage(`已选择系统 BGM：${song.title}，但当前浏览器需要再次点击后才能试听。`);
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
      audioUrl: audio.audioUrl
    };

    startCreationFlow();
    setSelected(audio.title);
    setSelectedArtist("用户上传音频");
    saveDraft({ songSourceType: "upload", musicSelected: true, songTitle: audio.title, artist: "用户上传音频" });
    void getLocalDraft().then((draft) => saveLocalDraft({ ...(draft ?? nextDraft), ...nextDraft }));
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
      audioUrl: undefined
    } as const;

    startCreationFlow();
    setSelected(track.title);
    setSelectedArtist(`${track.artist} · ${track.platform}`);
    if (sourceType === "link") {
      setResolvedTrack(track);
    }
    saveDraft(nextDraft);
    void getLocalDraft().then((draft) => saveLocalDraft({ ...(draft ?? nextDraft), ...nextDraft }));
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

    if (file.size > 15 * 1024 * 1024) {
      setUploadMessage("音频超过 15MB，请更换文件或选择默认 BGM。");
      return;
    }

    const audioUrl = await fileToDataUrl(file);
    const title = file.name.replace(/\.[^.]+$/, "");
    stopPreview();
    startCreationFlow();
    setUploadedAudio({ title, audioUrl });
    setSelected(title);
    const currentDraft = getDraft();
    const nextDraft = {
      ...currentDraft,
      songSourceType: "upload",
      musicSelected: true,
      songTitle: title,
      artist: "用户上传音频",
      audioUrl
    } as const;
    saveDraft({ songSourceType: "upload", musicSelected: true, songTitle: title, artist: "用户上传音频" });
    void getLocalDraft().then((draft) => saveLocalDraft({ ...(draft ?? nextDraft), ...nextDraft }));
    setSelectedArtist("用户上传音频");
    setUploadMessage("音频已保存到本地礼物草稿，生成链接后可在本机新窗口打开。");
    playUploadedPreview(audioUrl).catch(() => setUploadMessage("音频已保存；浏览器需要点击页面后才能试听。"));
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <AppHeader step="1 / 3 选择音乐" />
        <section className="section soft-card stack">
          <div>
            <h1>将音乐卡带放进你的礼物盒~</h1>
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
              <p className="hint">还没有选定背景歌曲。</p>
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
                <p className="hint">暂时没有匹配的推荐，可以换个词试试，或选择其他方式。</p>
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
            <p className="hint">支持 mp3 / wav / m4a，文件大小不超过 15MB。</p>
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
