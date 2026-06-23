"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getDraft, saveDraft } from "@/lib/gift";

const bgms = [
  { title: "晨光花园", artist: "BloomBeat 默认 BGM", mood: "轻柔、明亮" },
  { title: "晚风信笺", artist: "BloomBeat 默认 BGM", mood: "安静、温柔" },
  { title: "星光音乐盒", artist: "BloomBeat 默认 BGM", mood: "梦幻、礼物感" }
];

export default function SongPage() {
  const [selected, setSelected] = useState(bgms[0].title);

  useEffect(() => {
    setSelected(getDraft().songTitle);
  }, []);

  function chooseSong(song: (typeof bgms)[number]) {
    setSelected(song.title);
    saveDraft({ songTitle: song.title, artist: song.artist });
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <AppHeader step="1 / 3 选择音乐" />
        <section className="section soft-card stack">
          <div>
            <h1>选择一首送给 TA 的歌</h1>
            <p className="lead">阶段 1 先使用默认 BGM 跑通体验，QQ / 酷狗解析会在阶段 3 接入。</p>
          </div>

          <div className="field">
            <label>QQ 音乐 / 酷狗链接</label>
            <input className="input" placeholder="阶段 3 开放：粘贴歌曲链接" disabled />
            <p className="hint">当前阶段不会连接真实音乐 API，避免影响静态 MVP 稳定性。</p>
          </div>

          <div className="field">
            <span className="field-title">默认治愈系 BGM</span>
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
