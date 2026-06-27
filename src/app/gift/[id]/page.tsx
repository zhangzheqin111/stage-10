"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GiftExperience } from "@/components/GiftExperience";
import { copyTextToClipboard } from "@/lib/clipboard";
import { getCloudGift, saveCloudGift } from "@/lib/cloudGiftStore";
import { decodeDraftFromHash } from "@/lib/giftCodec";
import { GiftDraft, getDraft } from "@/lib/gift";

const fallbackGiftTitle = "BloomBeat 礼物";

function normalizeShareTitle(value: string, gift?: GiftDraft | null) {
  return value.trim().slice(0, 30) || gift?.title || fallbackGiftTitle;
}

export default function GiftPage() {
  const [gift, setGift] = useState<GiftDraft | null>(null);
  const [missing, setMissing] = useState(false);
  const [missingMessage, setMissingMessage] = useState("这份礼物暂时无法打开。链接可能已失效，或礼物还没有保存成功。");
  const [audioHint, setAudioHint] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [shareSaving, setShareSaving] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [currentShareUrl, setCurrentShareUrl] = useState("");
  const params = useParams<{ id: string }>();

  useEffect(() => {
    setCurrentShareUrl(window.location.href);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGift() {
      if (params.id === "share") {
        const draftFromHash = decodeDraftFromHash(window.location.hash);
        if (draftFromHash) {
          if (!cancelled) {
            setGift(draftFromHash);
            setShareTitle(draftFromHash.title || fallbackGiftTitle);
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

      if (params.id === "demo") {
        const localDraft = getDraft();
        if (!cancelled) {
          setGift(localDraft);
          setShareTitle(localDraft.title || fallbackGiftTitle);
          setAudioHint("");
        }
        return;
      }

      const cloudGift = await getCloudGift(params.id);
      if (cancelled) return;

      if (cloudGift.ok) {
        setGift(cloudGift.gift);
        setShareTitle(cloudGift.gift.title || fallbackGiftTitle);
        return;
      }

      const localDraft = getDraft();
      if (localDraft && localDraft.musicSelected) {
        setGift(localDraft);
        setShareTitle(localDraft.title || fallbackGiftTitle);
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
      console.error("[gift] loadGift failed", err);
      if (!cancelled) setMissing(true);
    });

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useEffect(() => {
    if (!audioHint) {
      return;
    }

    const timer = window.setTimeout(() => setAudioHint(""), 6000);
    return () => window.clearTimeout(timer);
  }, [audioHint]);

  function openSharePanel() {
    setCurrentShareUrl(window.location.href);
    setShareTitle(gift?.title || fallbackGiftTitle);
    setShareMessage("可以先改礼物卡名字，再生成新的转发链接。");
    setShareCopied(false);
    setShareOpen(true);
  }

  function updateShareTitle(value: string) {
    const nextTitle = value.slice(0, 30);
    setShareTitle(nextTitle);
    setShareCopied(false);
    setShareMessage("名字已更新，点击“更新转发链接”后会生成新的礼物链接。");
    setGift((current) => (current ? { ...current, title: normalizeShareTitle(nextTitle, current) } : current));
  }

  async function saveForwardLink() {
    if (!gift) return;

    const nextTitle = normalizeShareTitle(shareTitle, gift);
    const nextGift = { ...gift, title: nextTitle };
    setGift(nextGift);
    setShareTitle(nextTitle);
    setShareSaving(true);
    setShareCopied(false);
    setShareMessage("正在保存新的礼物卡名字...");

    try {
      const cloud = await saveCloudGift(nextGift);
      const nextUrl = `${window.location.origin}/gift/${cloud.id}`;
      setCurrentShareUrl(nextUrl);
      setGift({ ...cloud.gift, title: nextTitle });
      setShareMessage("新的转发链接已生成，可以复制或分享至系统应用。");
    } catch (err) {
      console.error("[gift] saveForwardLink failed", err);
      setShareMessage("名字已在当前页面更新，但新的转发链接保存失败。请稍后再试。");
    } finally {
      setShareSaving(false);
    }
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

  async function shareViaSystem() {
    const shareUrl = currentShareUrl || window.location.href;
    const title = normalizeShareTitle(shareTitle, gift);

    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title,
          text: `送你一份特别的音乐礼物：${title}`,
          url: shareUrl
        });
        setShareMessage("已打开系统分享面板。");
        return;
      } catch {
        const copied = await copyTextToClipboard(shareUrl);
        setShareCopied(copied);
        setShareMessage(copied ? "当前系统暂不支持该功能，链接已复制，可直接粘贴分享。" : "当前系统暂不支持该功能，请手动复制链接后分享。");
        if (copied) {
          window.setTimeout(() => setShareCopied(false), 1800);
        }
        return;
      }
    }

    const copied = await copyTextToClipboard(shareUrl);
    setShareCopied(copied);
    setShareMessage(copied ? "当前系统暂不支持该功能，链接已复制，可直接粘贴分享。" : "当前系统暂不支持该功能，请手动复制链接后分享。");
    if (copied) {
      window.setTimeout(() => setShareCopied(false), 1800);
    }
  }

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

  return (
    <main className="app-shell-full">
      <div className="phone-frame-full">
        {audioHint ? <div className="audio-hint-banner">{audioHint}</div> : null}
        <GiftExperience
          actionRight={
            <button className="share-fab" onClick={openSharePanel} type="button" aria-label="转发礼物">
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
          <div className="share-popover" onPointerDown={(event) => event.stopPropagation()}>
            <button className="share-close" onClick={() => setShareOpen(false)} type="button" aria-label="关闭">
              ×
            </button>
            <strong>转发这份礼物</strong>
            <p className="hint">二次转发前可以修改礼物卡名字，生成的新链接会保留这个名字。</p>
            <label className="share-title-field">
              礼物卡名字
              <input
                className="input"
                maxLength={30}
                onChange={(event) => updateShareTitle(event.target.value)}
                placeholder="给这份礼物取个名字"
                value={shareTitle}
              />
            </label>
            <button className="primary-btn share-generate-btn" disabled={shareSaving} onClick={saveForwardLink} type="button">
              {shareSaving ? "保存中..." : "更新转发链接"}
            </button>
            <input className="input" readOnly value={currentShareUrl} />
            {shareMessage ? <p className={`hint ${shareCopied ? "copy-success" : ""}`}>{shareMessage}</p> : null}
            <div className="share-popover-actions">
              <button className={`secondary-btn ${shareCopied ? "copy-done" : ""}`} disabled={shareSaving} onClick={copyGiftLink} type="button">
                {shareCopied ? "已复制" : "复制链接"}
              </button>
              <button className="primary-btn" disabled={shareSaving} onClick={shareViaSystem} type="button">
                分享至
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
