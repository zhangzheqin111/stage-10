"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { GiftExperience } from "@/components/GiftExperience";
import { copyTextToClipboard } from "@/lib/clipboard";
import { CloudGiftSaveError, CloudGiftSaveProgress, saveCloudGift } from "@/lib/cloudGiftStore";
import { shouldStartFromGuide } from "@/lib/creationFlow";
import { buildShareUrl } from "@/lib/giftCodec";
import { GiftDraft, getDraft, saveDraft } from "@/lib/gift";
import { getLocalDraft, saveLocalDraft } from "@/lib/localGiftStore";
import { prepareCloudResourceOnce } from "@/lib/mediaPreparation";

function hasLocalUploadResource(draft: GiftDraft) {
  return Boolean(draft.audioUrl?.startsWith("data:") || draft.backgroundImageUrl?.startsWith("data:"));
}

function getPreparationStatus(draft: GiftDraft) {
  const musicPreparing = Boolean(draft.audioUrl?.startsWith("data:"));
  const imagePreparing = Boolean(draft.backgroundImageUrl?.startsWith("data:"));

  return {
    musicPreparing,
    imagePreparing,
    allReady: !musicPreparing && !imagePreparing
  };
}

const shareProgressMessage: Record<CloudGiftSaveProgress, string> = {
  "upload-audio": "正在准备音乐...",
  "upload-image": "正在准备图片...",
  "save-gift": "正在生成礼物链接..."
};

function getFallbackShareMessage(error: unknown, draft: GiftDraft) {
  const reason =
    error instanceof CloudGiftSaveError
      ? `${error.phase === "upload" ? "礼物还没有准备好" : "礼物链接生成失败"}：${error.message}`
      : error instanceof Error
        ? error.message
        : "礼物链接暂时生成失败";

  const resourceHint = hasLocalUploadResource(draft)
    ? "请稍等一下，等音乐或图片准备好后再生成链接。"
    : "已生成自包含兜底链接，可先复制转发。";

  return `${reason}。${resourceHint}`;
}

function getDefaultGiftTitle(draft: GiftDraft) {
  const displayName = draft.recipientName.trim() || "TA";
  return `给${displayName}的礼物`;
}

export default function PreviewPage() {
  const [draft, setDraft] = useState<GiftDraft | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareGenerating, setShareGenerating] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [marqueeMessage, setMarqueeMessage] = useState("");
  const [guideOpen, setGuideOpen] = useState(true);
  const preparingResourcesRef = useRef(new Set<string>());

  useEffect(() => {
    if (shouldStartFromGuide()) {
      window.location.replace("/");
      return;
    }

    getLocalDraft()
      .then((savedDraft) => {
        const localDraft = getDraft();
        if (!savedDraft) {
          setDraft(localDraft);
          return;
        }

        const mergedDraft = { ...savedDraft, ...localDraft };
        if (savedDraft.audioUrl && (!localDraft.audioUrl || localDraft.audioUrl.startsWith("data:"))) {
          mergedDraft.audioUrl = savedDraft.audioUrl;
          mergedDraft.songSourceType = "upload";
          mergedDraft.musicSelected = true;
          mergedDraft.songTitle = savedDraft.songTitle;
          mergedDraft.artist = savedDraft.artist;
          mergedDraft.bgmPresetId = undefined;
        }
        if (savedDraft.backgroundImageUrl && (!localDraft.backgroundImageUrl || localDraft.backgroundImageUrl.startsWith("data:"))) {
          mergedDraft.backgroundImageUrl = savedDraft.backgroundImageUrl;
        }
        setDraft(mergedDraft);
      })
      .catch(() => setDraft(getDraft()));
  }, []);

  useEffect(() => {
    if (!draft) return;

    const audioDataUrl = draft.audioUrl?.startsWith("data:") ? draft.audioUrl : "";
    const imageDataUrl = draft.backgroundImageUrl?.startsWith("data:") ? draft.backgroundImageUrl : "";

    if (!audioDataUrl && !imageDataUrl) {
      return;
    }

    if (audioDataUrl && !preparingResourcesRef.current.has(audioDataUrl)) {
      preparingResourcesRef.current.add(audioDataUrl);
      prepareCloudResourceOnce(audioDataUrl, "audio")
        .then((url) => {
          if (cancelled) return;
          setDraft((currentDraft) => {
            if (!currentDraft || currentDraft.audioUrl !== audioDataUrl) return currentDraft;
            const nextDraft = { ...currentDraft, audioUrl: url };
            saveDraft(nextDraft);
            saveLocalDraft(nextDraft).catch(() => undefined);
            const preparation = getPreparationStatus(nextDraft);
            setShareMessage((message) =>
              message.includes("准备") ? (preparation.allReady ? "音乐和图片已准备好，可以生成可转发链接。" : "音乐已准备好，图片如果还在准备会继续处理。") : message
            );
            return nextDraft;
          });
        })
        .catch(() => {
          preparingResourcesRef.current.delete(audioDataUrl);
        });
    }

    if (imageDataUrl && !preparingResourcesRef.current.has(imageDataUrl)) {
      preparingResourcesRef.current.add(imageDataUrl);
      prepareCloudResourceOnce(imageDataUrl, "image")
        .then((url) => {
          if (cancelled) return;
          setDraft((currentDraft) => {
            if (!currentDraft || currentDraft.backgroundImageUrl !== imageDataUrl) return currentDraft;
            const nextDraft = { ...currentDraft, backgroundImageUrl: url };
            saveDraft(nextDraft);
            saveLocalDraft(nextDraft).catch(() => undefined);
            const preparation = getPreparationStatus(nextDraft);
            setShareMessage((message) =>
              message.includes("准备") ? (preparation.allReady ? "音乐和图片已准备好，可以生成可转发链接。" : "图片已准备好，音乐如果还在准备会继续处理。") : message
            );
            return nextDraft;
          });
        })
        .catch(() => {
          preparingResourcesRef.current.delete(imageDataUrl);
        });
    }

    let cancelled = false;

    return () => {
      cancelled = true;
    };
  }, [draft]);

  if (!draft) {
    return (
      <main className="app-shell">
        <div className="phone-frame">
          <AppHeader step="3 / 3 预览" />
          <section className="section soft-card stack loading-card">
            <span className="loading-dots" aria-hidden="true" />
            <h1>正在整理礼物预览</h1>
            <p className="lead">花园、音乐和祝福语马上就位。</p>
          </section>
        </div>
      </main>
    );
  }

  function openShare() {
    if (!draft) return;
    const defaultTitle = getDefaultGiftTitle(draft);
    const nextDraft = { ...draft, title: defaultTitle };
    setDraft(nextDraft);
    saveDraft(nextDraft);
    saveLocalDraft(nextDraft).catch(() => undefined);
    setShareUrl("");
    setShareTitle(defaultTitle);
    const preparation = getPreparationStatus(nextDraft);
    setShareMessage(preparation.allReady ? "默认名称来自编辑页昵称，也可以在这里修改。" : "音乐或图片还在准备，完成后即可生成可转发链接。");
    setShareCopied(false);
    setShareOpen(true);
  }

  function updateShareTitle(value: string) {
    if (!draft) return;

    const nextShareTitle = value.slice(0, 30);
    const fallbackTitle = getDefaultGiftTitle(draft);
    const nextDraft = { ...draft, title: nextShareTitle.trim() || fallbackTitle };
    setShareTitle(nextShareTitle);
    setDraft(nextDraft);
    saveDraft(nextDraft);
    saveLocalDraft(nextDraft).catch(() => undefined);
    if (shareUrl) {
      setShareUrl("");
      setShareMessage("名称已修改，请重新生成分享链接。");
      setShareCopied(false);
    }
  }

  async function generateShareLink() {
    if (!draft) return;

    const nextTitle = shareTitle.trim().slice(0, 30) || getDefaultGiftTitle(draft);
    const nextDraft = { ...draft, title: nextTitle };
    setDraft(nextDraft);
    saveDraft(nextDraft);
    saveLocalDraft(nextDraft).catch(() => undefined);
    setShareTitle(nextTitle);
    setShareUrl("");
    setShareCopied(false);
    setShareMessage("正在检查礼物是否准备好...");

    if (hasLocalUploadResource(nextDraft)) {
      setShareMessage("音乐或图片还在准备，完成后才能生成可转发链接。");
      return;
    }

    setShareGenerating(true);

    try {
      const startedAt = performance.now();
      const cloud = await saveCloudGift(nextDraft, (progress) => {
        setShareMessage(shareProgressMessage[progress]);
      });
      setShareUrl(`${window.location.origin}/gift/${cloud.id}`);
      const seconds = Math.max(1, Math.round((performance.now() - startedAt) / 1000));
      setShareMessage(`礼物链接已生成，用时约 ${seconds} 秒，可以复制后发给朋友。`);
    } catch (error) {
      if (hasLocalUploadResource(nextDraft)) {
        setShareUrl("");
        setShareMessage(`礼物还没有准备好，请稍等一下再生成链接。${getFallbackShareMessage(error, nextDraft)}`);
      } else {
        setShareUrl(buildShareUrl(nextDraft, window.location.origin));
        setShareMessage(getFallbackShareMessage(error, nextDraft));
      }
    } finally {
      setShareGenerating(false);
    }
  }

  function toggleMarquee() {
    if (!draft) return;

    const nextEnabled = !(draft.blessingMarqueeEnabled ?? true);
    const nextDraft = { ...draft, blessingMarqueeEnabled: nextEnabled };
    setDraft(nextDraft);
    saveDraft(nextDraft);
    saveLocalDraft(nextDraft).catch(() => undefined);
    setMarqueeMessage(nextEnabled ? "祝福弹幕已显示" : "祝福弹幕已隐藏");
    window.setTimeout(() => setMarqueeMessage(""), 1600);
  }

  async function copyShareLink() {
    if (!shareUrl) return;

    const copied = await copyTextToClipboard(shareUrl);
    setShareCopied(copied);
    setShareMessage(copied ? "链接已复制，可以粘贴转发给朋友。" : "复制失败，请长按链接手动选中后复制。");
    if (copied) {
      window.setTimeout(() => setShareCopied(false), 1800);
    }
  }

  async function shareViaSystem() {
    if (!shareUrl) return;

    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: shareTitle.trim() || draft?.title || "BloomBeat 礼物", text: "送你一份特别的音乐礼物", url: shareUrl });
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

  const marqueeEnabled = draft.blessingMarqueeEnabled ?? true;
  const preparation = getPreparationStatus(draft);

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <AppHeader step="3 / 3 预览" />
        <GiftExperience
          actionRight={
            <button
              className="share-fab marquee-toggle-fab"
              onClick={toggleMarquee}
              type="button"
              aria-label={marqueeEnabled ? "隐藏祝福弹幕" : "显示祝福弹幕"}
              title={marqueeEnabled ? "隐藏祝福弹幕" : "显示祝福弹幕"}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H13l-4.1 3.4A1.15 1.15 0 0 1 7 17.52V15h-.5A2.5 2.5 0 0 1 4 12.5v-7Zm4 3.25a.9.9 0 1 0 0 1.8h8a.9.9 0 1 0 0-1.8H8Zm0-3a.9.9 0 0 0 0 1.8h5.6a.9.9 0 1 0 0-1.8H8Z"
                  fill="currentColor"
                />
                {marqueeEnabled ? null : <path d="M4.7 3.3 20.7 19.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
              </svg>
              弹幕
            </button>
          }
          gift={draft}
          guideCompleteLabel="查看礼物生成"
          onGuideOpenChange={setGuideOpen}
        />
        {marqueeMessage ? <div className="preview-toast">{marqueeMessage}</div> : null}
        {shareOpen ? (
          <div className="share-popover">
            <button className="share-close" onClick={() => setShareOpen(false)} type="button" aria-label="关闭">
              ×
            </button>
            <strong>分享这份礼物</strong>
            <p className="hint">默认名称来自编辑页昵称；也可以在这里修改，礼物卡题目会同步更新。</p>
            <label className="share-title-field">
              <span>礼物名字</span>
              <input
                className="input"
                maxLength={30}
                onChange={(event) => updateShareTitle(event.target.value)}
                placeholder="给这份礼物取个名字"
                value={shareTitle}
              />
            </label>
            <div className="share-readiness" aria-live="polite">
              <span>礼物内容已完成</span>
              <span>{preparation.musicPreparing ? "音乐准备中" : "音乐已准备好"}</span>
              <span>{preparation.imagePreparing ? "图片准备中" : "图片已准备好"}</span>
            </div>
            <button className="primary-btn share-generate-btn" disabled={shareGenerating} onClick={generateShareLink} type="button">
              {shareGenerating ? "生成中..." : shareUrl ? "重新生成链接" : preparation.allReady ? "生成分享链接" : "准备中，稍后生成"}
            </button>
            {shareUrl ? <input className="input" readOnly value={shareUrl} /> : null}
            {shareMessage ? <p className={`hint ${shareCopied ? "copy-success" : ""}`}>{shareMessage}</p> : null}
            <div className="share-popover-actions">
              <button className={`secondary-btn ${shareCopied ? "copy-done" : ""}`} disabled={!shareUrl || shareGenerating} onClick={copyShareLink} type="button">
                {shareCopied ? "已复制" : shareGenerating ? "生成中" : "复制链接"}
              </button>
              <button className="primary-btn" disabled={!shareUrl || shareGenerating} onClick={shareViaSystem} type="button">
                分享至
              </button>
            </div>
          </div>
        ) : null}
        {!guideOpen ? (
          <div className="footer-actions">
            <Link className="secondary-btn" href="/create/content">
              返回编辑
            </Link>
            <button className="primary-btn" disabled={shareGenerating} onClick={openShare} type="button">
              {shareGenerating ? "生成中..." : "完成并分享"}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
