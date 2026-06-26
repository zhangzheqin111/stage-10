"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GiftExperience } from "@/components/GiftExperience";
import { copyTextToClipboard } from "@/lib/clipboard";
import { getCloudGift } from "@/lib/cloudGiftStore";
import { decodeDraftFromHash } from "@/lib/giftCodec";
import { getDraft } from "@/lib/gift";

export default function GiftPage() {
  const [gift, setGift] = useState<ReturnType<typeof getDraft> | null>(null);
  const [missing, setMissing] = useState(false);
  const [missingMessage, setMissingMessage] = useState("这份礼物暂时无法打开。链接可能已失效，或礼物还没有保存成功。");
  const [audioHint, setAudioHint] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [currentShareUrl, setCurrentShareUrl] = useState("");
  const params = useParams<{ id: string }>();

  useEffect(() => {
    setCurrentShareUrl(window.location.href);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGift() {
      // ---------- 第一优先级：URL hash 自包含礼物 ----------
      if (params.id === "share") {
        const draftFromHash = decodeDraftFromHash(window.location.hash);
        if (draftFromHash) {
          if (!cancelled) {
            setGift(draftFromHash);
            // 分享链接不含上传音频，给出提示
            if (draftFromHash.songSourceType === "upload" && !draftFromHash.audioUrl) {
              setAudioHint("这份礼物原本含有自定义音频，但自定义音频无法放入分享链接。已自动使用系统 BGM 代替，不影响其他效果。");
            }
          }
          return;
        }
        if (!cancelled) {
          setMissingMessage("礼物链接已失效，请让发送者重新生成。");
          setMissing(true);
        }
        return;
      }

      // ---------- 第二优先级：demo 模式走 localStorage ----------
      if (params.id === "demo") {
        const localDraft = getDraft();
        if (!cancelled) {
          setGift(localDraft);
          setAudioHint("");
        }
        return;
      }

      // ---------- 第三优先级：云端礼物 ----------
      const cloudGift = await getCloudGift(params.id);
      if (cancelled) return;

      if (cloudGift.ok) {
        setGift(cloudGift.gift);
        return;
      }

      // -------- 兜底：localStorage（可能和生成者是同一设备） --------
      const localDraft = getDraft();
      if (localDraft && localDraft.musicSelected) {
        setGift(localDraft);
        return;
      }

      if (!cancelled) {
        setMissingMessage(
          cloudGift.reason === "unconfigured"
            ? "这份礼物还没有保存成功。请让发送者重新生成礼物链接后再打开。"
            : "这份礼物暂时无法打开。链接可能已失效，或礼物还没有保存成功。"
        );
        setMissing(true);
      }
    }

    loadGift().catch((err) => {
      console.error("[gift] loadGift 失败", err);
      if (!cancelled) setMissing(true);
    });
    return () => { cancelled = true; };
  }, [params.id]);

  useEffect(() => {
    if (!audioHint) {
      return;
    }

    const timer = window.setTimeout(() => setAudioHint(""), 6000);
    return () => window.clearTimeout(timer);
  }, [audioHint]);

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

  async function handleShare() {
    const shareUrl = currentShareUrl || window.location.href;
    // 尝试系统分享
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: "BloomBeat 礼物", text: "送你一份特别的音乐礼物", url: shareUrl });
        return;
      } catch {
        // 用户取消或失败，继续弹窗
      }
    }
    // 弹出自定义面板
    setCurrentShareUrl(window.location.href);
    setShareOpen(true);
  }

  async function copyGiftLink() {
    const shareUrl = currentShareUrl || window.location.href;
    const copied = await copyTextToClipboard(shareUrl);
    setShareCopied(copied);
    setShareMessage(copied ? "礼物链接已复制，可以继续转发这份心意。" : "复制失败，请长按链接或手动选中后复制。");
    if (copied) {
      window.setTimeout(() => setShareCopied(false), 1800);
    }
  }

  return (
    <main className="app-shell-full">
      <div className="phone-frame-full">
        {audioHint ? (
          <div className="audio-hint-banner">{audioHint}</div>
        ) : null}
        <GiftExperience
          actionRight={
            <button className="share-fab" onClick={handleShare} type="button" aria-label="转发礼物">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.34 3.34 0 0 0 0-1.4l7.05-4.11c.54.5 1.25.81 2.04.81a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 9.81a3 3 0 1 0 0 4.38l7.12 4.16c-.05.21-.07.43-.07.65a2.92 2.92 0 1 0 2.91-2.92Z"
                  fill="currentColor"
                />
              </svg>
              转发
            </button>
          }
          gift={gift}
        />
        {shareOpen ? (
          <div className="share-popover" onPointerDown={(e) => e.stopPropagation()}>
            <button className="share-close" onClick={() => setShareOpen(false)} type="button" aria-label="关闭">
              ×
            </button>
            <strong>转发这份礼物</strong>
            <p className="hint">复制礼物链接，让更多人看到这份心意。</p>
            <input className="input" readOnly value={currentShareUrl} />
            {shareMessage ? <p className={`hint ${shareCopied ? "copy-success" : ""}`}>{shareMessage}</p> : null}
            <button className="primary-btn" onClick={copyGiftLink} type="button">
              {shareCopied ? "已复制" : "复制链接"}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
