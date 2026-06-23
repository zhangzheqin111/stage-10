import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function HomePage() {
  return (
    <main className="app-shell">
      <div className="phone-frame">
        <AppHeader />
        <section className="section soft-card">
          <p className="hint">治愈系 2D 互动音乐礼物 H5</p>
          <h1 className="hero-title">让一首歌，在花里轻轻打开。</h1>
          <p className="lead">
            选择一段旋律，写一句祝福，把它变成可以触摸互动的 BloomBeat（花律）礼物。
          </p>
          <div className="footer-actions">
            <Link className="primary-btn" href="/create/song">
              开始制作
            </Link>
            <Link className="secondary-btn" href="/gift/demo">
              查看示例
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
