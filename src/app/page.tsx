"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { startCreationFlow, stopCreationFlow } from "@/lib/creationFlow";
import { clearDraft } from "@/lib/gift";
import { clearLocalDraft } from "@/lib/localGiftStore";

export default function HomePage() {
  function resetDraft() {
    stopCreationFlow();
    clearDraft();
    clearLocalDraft().catch(() => {
      // Resetting should never block the user from starting.
    });
  }

  function startFreshDraft() {
    resetDraft();
    startCreationFlow();
  }

  useEffect(() => {
    resetDraft();
  }, []);

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <AppHeader />
        <section className="section soft-card home-card">
          <div className="home-motif" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="home-content">
            <div className="brand-flower" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <p className="hint">治愈系 2D 互动音乐礼物 H5</p>
            <h1 className="hero-title">让一首歌，在花里轻轻打开。</h1>
            <p className="lead">
              选择一段旋律，写一句祝福，把它变成可以触摸互动的 BloomBeat（花律）礼物。
            </p>
            <div className="single-action">
              <Link className="primary-btn" href="/create/song" onClick={startFreshDraft}>
                开始制作
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
