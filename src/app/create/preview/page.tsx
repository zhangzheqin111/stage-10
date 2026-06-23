"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { GiftExperience } from "@/components/GiftExperience";
import { GiftDraft, getDraft } from "@/lib/gift";
import { createGiftId, getLocalDraft, saveLocalGift } from "@/lib/localGiftStore";

export default function PreviewPage() {
  const [draft, setDraft] = useState<GiftDraft | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    getLocalDraft()
      .then((savedDraft) => setDraft(savedDraft ?? getDraft()))
      .catch(() => setDraft(getDraft()));
  }, []);

  if (!draft) {
    return null;
  }

  async function createShareLink() {
    if (!draft) {
      return;
    }

    const id = createGiftId();
    const gift = { ...draft, id };
    await saveLocalGift(gift);
    const nextShareUrl = `${window.location.origin}/gift/${id}`;
    setShareUrl(nextShareUrl);
    setShareMessage("礼物链接已生成，可在本机新窗口打开验收。");
  }

  async function copyShareLink() {
    if (!shareUrl) {
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setShareMessage("链接已复制。");
  }

  async function handleShareAction() {
    if (shareUrl) {
      await copyShareLink();
      return;
    }
    await createShareLink();
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <AppHeader step="3 / 3 预览" />
        <GiftExperience
          actionRight={
            <button className="share-fab" onClick={() => setShareOpen(true)} type="button" aria-label="分享礼物">
              <span className="share-curve" />
            </button>
          }
          gift={draft}
        />
        {shareOpen ? (
          <div className="share-popover">
            <button className="share-close" onClick={() => setShareOpen(false)} type="button" aria-label="关闭">
              ×
            </button>
            <strong>分享这份礼物</strong>
            <p className="hint">阶段 2 当前使用本地 IndexedDB 保存礼物；接入 Supabase 后，同一链接可跨设备访问。</p>
            {shareUrl ? <input className="input" readOnly value={shareUrl} /> : null}
            {shareMessage ? <p className="hint">{shareMessage}</p> : null}
            <button className="primary-btn" onClick={handleShareAction} type="button">
              {shareUrl ? "复制链接" : "生成礼物链接"}
            </button>
          </div>
        ) : null}
        <div className="footer-actions">
          <Link className="secondary-btn" href="/create/content">
            返回编辑
          </Link>
          <Link className="primary-btn" href={shareUrl || "/gift/demo"}>
            礼物效果
          </Link>
        </div>
      </div>
    </main>
  );
}
