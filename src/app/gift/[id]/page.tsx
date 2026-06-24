"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { GiftExperience } from "@/components/GiftExperience";
import { getCloudGift } from "@/lib/cloudGiftStore";
import { GiftDraft, getDraft } from "@/lib/gift";
import { getLocalDraft, getLocalGift } from "@/lib/localGiftStore";

export default function GiftPage() {
  const [gift, setGift] = useState<GiftDraft | null>(null);
  const [missing, setMissing] = useState(false);
  const [missingMessage, setMissingMessage] = useState("阶段 2 本地模式下，礼物链接需要在同一台设备和同一浏览器中打开。");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [currentShareUrl, setCurrentShareUrl] = useState("");
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const fromPreview = searchParams.get("from") === "preview";

  useEffect(() => {
    setCurrentShareUrl(`${window.location.origin}/gift/${params.id}`);
  }, [params.id]);

  useEffect(() => {
    async function loadGift() {
      if (params.id === "demo") {
        setGift((await getLocalDraft()) ?? getDraft());
        return;
      }

      const cloudGift = await getCloudGift(params.id);
      if (cloudGift.ok) {
        setGift(cloudGift.gift);
        return;
      }

      const savedGift = await getLocalGift(params.id);
      if (savedGift) {
        setGift(savedGift);
      } else {
        setMissingMessage(
          cloudGift.reason === "unconfigured"
            ? "云端分享未配置，且本机浏览器没有找到这份本地礼物。请在生成链接的同一设备和同一浏览器中打开，或配置 Supabase 后重新生成云端链接。"
            : "云端和本机浏览器都没有找到这份礼物。链接可能已失效，或礼物数据尚未成功保存。"
        );
        setMissing(true);
      }
    }

    loadGift().catch(() => setMissing(true));
  }, [params.id]);

  if (missing) {
    return (
      <main className="app-shell">
        <div className="phone-frame">
          <section className="section soft-card stack">
            <h1>没有找到这份礼物</h1>
            <p className="lead">{missingMessage}</p>
          </section>
        </div>
      </main>
    );
  }

  if (!gift) {
    return null;
  }

  async function copyGiftLink() {
    const shareUrl = currentShareUrl || `${window.location.origin}/gift/${params.id}`;
    await navigator.clipboard.writeText(shareUrl);
    setShareMessage("礼物链接已复制，可以继续转发这份心意。");
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <GiftExperience
          actionRight={
            <button className="share-fab" onClick={() => setShareOpen(true)} type="button" aria-label="转发礼物">
              <span className="share-curve" />
            </button>
          }
          gift={gift}
        />
        {fromPreview ? (
          <div className="preview-return">
            <Link href="/create/preview">返回</Link>
          </div>
        ) : null}
        {shareOpen ? (
          <div className="share-popover">
            <button className="share-close" onClick={() => setShareOpen(false)} type="button" aria-label="关闭">
              ×
            </button>
            <strong>转发这份礼物</strong>
            <p className="hint">复制礼物链接，让更多人看到这份心意。</p>
            <input className="input" readOnly value={currentShareUrl} />
            {shareMessage ? <p className="hint">{shareMessage}</p> : null}
            <button className="primary-btn" onClick={copyGiftLink} type="button">
              复制链接
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
