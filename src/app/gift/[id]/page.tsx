"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { GiftExperience } from "@/components/GiftExperience";
import { copyTextToClipboard } from "@/lib/clipboard";
import { markReturnToEdit } from "@/lib/creationFlow";
import { getCloudGift } from "@/lib/cloudGiftStore";
import { GiftDraft, getDraft } from "@/lib/gift";
import { getLocalDraft, getLocalGift } from "@/lib/localGiftStore";

const minimumLoadingTime = 720;

function waitForLoadingCue() {
  return new Promise((resolve) => window.setTimeout(resolve, minimumLoadingTime));
}

export default function GiftPage() {
  const [gift, setGift] = useState<GiftDraft | null>(null);
  const [missing, setMissing] = useState(false);
  const [missingMessage, setMissingMessage] = useState("这份礼物暂时无法打开。链接可能已失效，或礼物还没有保存成功。");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [currentShareUrl, setCurrentShareUrl] = useState("");
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const fromPreview = searchParams.get("from") === "preview";

  useEffect(() => {
    setCurrentShareUrl(`${window.location.origin}/gift/${params.id}`);
  }, [params.id]);

  useEffect(() => {
    async function loadGift() {
      await waitForLoadingCue();

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
            ? "这份礼物还没有保存成功。请让发送者重新生成礼物链接后再打开。"
            : "这份礼物暂时无法打开。链接可能已失效，或礼物还没有保存成功。"
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
          <section className="section soft-card stack state-card centered">
            <span className="state-icon" aria-hidden="true">!</span>
            <h1>没有找到这份礼物</h1>
            <p className="lead">{missingMessage}</p>
            <div className="state-actions">
              <Link className="secondary-btn" href="/">
                回到首页
              </Link>
              <button className="primary-btn" onClick={() => window.location.reload()} type="button">
                重新打开
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!gift) {
    return (
      <main className="app-shell">
        <div className="phone-frame">
          <section className="section soft-card stack loading-card">
            <span className="loading-dots" aria-hidden="true" />
            <h1>正在打开这份礼物</h1>
            <p className="lead">正在准备音乐盒和花园互动。</p>
          </section>
        </div>
      </main>
    );
  }

  async function copyGiftLink() {
    const shareUrl = currentShareUrl || `${window.location.origin}/gift/${params.id}`;
    const copied = await copyTextToClipboard(shareUrl);
    setShareCopied(copied);
    setShareMessage(copied ? "礼物链接已复制，可以继续转发这份心意。" : "复制失败，请长按链接或手动选中后复制。");
    if (copied) {
      window.setTimeout(() => setShareCopied(false), 1800);
    }
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
            <Link href="/create/preview" onClick={markReturnToEdit}>返回</Link>
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
            {shareMessage ? <p className={`hint ${shareCopied ? "copy-success" : ""}`}>{shareMessage}</p> : null}
            <button className={`primary-btn ${shareCopied ? "copy-done" : ""}`} onClick={copyGiftLink} type="button">
              {shareCopied ? "已复制" : "复制链接"}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
