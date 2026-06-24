"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { GiftExperience } from "@/components/GiftExperience";
import { saveCloudGift } from "@/lib/cloudGiftStore";
import { isReloadNavigation, shouldStartFromGuide } from "@/lib/creationFlow";
import { GiftDraft, getDraft } from "@/lib/gift";
import { createGiftId, getLocalDraft, saveLocalDraft, saveLocalGift } from "@/lib/localGiftStore";

export default function PreviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<GiftDraft | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (shouldStartFromGuide()) {
      router.replace("/");
      return;
    }

    getLocalDraft()
      .then((savedDraft) => {
        const baseDraft = savedDraft ?? getDraft();
        const nextDraft = isReloadNavigation()
          ? {
              ...baseDraft,
              audioUrl: undefined,
              backgroundImageUrl: undefined,
              backgroundPositionX: 50,
              backgroundPositionY: 0,
              backgroundScale: 100
            }
          : baseDraft;

        if (isReloadNavigation()) {
          saveLocalDraft(nextDraft);
        }

        setDraft(nextDraft);
      })
      .catch(() => setDraft(getDraft()));
  }, [router]);

  if (!draft) {
    return null;
  }

  const giftEffectHref = shareUrl ? `${new URL(shareUrl).pathname}?from=preview` : "/gift/demo?from=preview";

  async function createShareLink() {
    if (!draft) {
      return;
    }

    setShareMessage("正在生成礼物链接...");

    try {
      const cloud = await saveCloudGift(draft);
      const nextShareUrl = `${window.location.origin}/gift/${cloud.id}`;
      setShareUrl(nextShareUrl);
      setShareMessage("云端礼物链接已生成，可复制后在新窗口或其他设备打开。");
    } catch {
      const id = createGiftId();
      const gift = { ...draft, id };
      await saveLocalGift(gift);
      const nextShareUrl = `${window.location.origin}/gift/${id}`;
      setShareUrl(nextShareUrl);
      setShareMessage("礼物链接已生成，可以复制后转发这份心意。");
    }
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
            <p className="hint">生成一条专属礼物链接，复制后就可以把这份心意转发给 TA。</p>
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
          <Link className="primary-btn" href={giftEffectHref}>
            礼物效果
          </Link>
        </div>
      </div>
    </main>
  );
}
