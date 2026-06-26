"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { GiftExperience } from "@/components/GiftExperience";
import { copyTextToClipboard } from "@/lib/clipboard";
import { saveCloudGift } from "@/lib/cloudGiftStore";
import { shouldStartFromGuide } from "@/lib/creationFlow";
import { buildShareUrl } from "@/lib/giftCodec";
import { GiftDraft, getDraft, saveDraft } from "@/lib/gift";
import { getLocalDraft, saveLocalDraft } from "@/lib/localGiftStore";

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
        if (!localDraft.audioUrl && savedDraft.audioUrl) {
          mergedDraft.audioUrl = savedDraft.audioUrl;
          mergedDraft.songSourceType = "upload";
          mergedDraft.musicSelected = true;
          mergedDraft.songTitle = savedDraft.songTitle;
          mergedDraft.artist = savedDraft.artist;
          mergedDraft.bgmPresetId = undefined;
        }
        if (!localDraft.backgroundImageUrl && savedDraft.backgroundImageUrl) {
          mergedDraft.backgroundImageUrl = savedDraft.backgroundImageUrl;
        }
        setDraft(mergedDraft);
      })
      .catch(() => setDraft(getDraft()));
  }, []);

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
    setShareMessage("默认名称来自编辑页昵称，也可以在这里修改。");
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
    setShareMessage("正在生成礼物链接...");
    setShareGenerating(true);

    try {
      const cloud = await saveCloudGift(nextDraft);
      setShareUrl(`${window.location.origin}/gift/${cloud.id}`);
      setShareMessage("礼物链接已生成，可复制后发给朋友。");
    } catch {
      setShareUrl(buildShareUrl(nextDraft, window.location.origin));
      setShareMessage("云端保存暂不可用，已生成自包含链接；上传音频或图片跨设备分享需后续云端配置。");
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

  function shareViaSystem() {
    if (!shareUrl) return;

    if (typeof navigator !== "undefined" && (navigator as any).share) {
      (navigator as any)
        .share({ title: shareTitle.trim() || draft?.title || "BloomBeat 礼物", text: "送你一份特别的音乐礼物", url: shareUrl })
        .catch(() => {
          // User cancelled or the browser refused native sharing.
        });
    } else {
      copyShareLink();
    }
  }

  const marqueeEnabled = draft.blessingMarqueeEnabled ?? true;

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
        />
        {marqueeMessage ? <div className="preview-toast">{marqueeMessage}</div> : null}
        {shareOpen ? (
          <div className="share-popover">
            <button className="share-close" onClick={() => setShareOpen(false)} type="button" aria-label="关闭">
              ×
            </button>
            <strong>分享这份礼物</strong>
            <p className="hint">默认名称来自编辑页昵称；你也可以在这里修改，礼品卡题目会同步更新。</p>
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
            <button className="primary-btn share-generate-btn" disabled={shareGenerating} onClick={generateShareLink} type="button">
              {shareGenerating ? "生成中..." : shareUrl ? "重新生成链接" : "生成分享链接"}
            </button>
            {shareUrl ? <input className="input" readOnly value={shareUrl} /> : null}
            {shareMessage ? <p className={`hint ${shareCopied ? "copy-success" : ""}`}>{shareMessage}</p> : null}
            <div className="share-popover-actions">
              <button className={`secondary-btn ${shareCopied ? "copy-done" : ""}`} disabled={!shareUrl || shareGenerating} onClick={copyShareLink} type="button">
                {shareCopied ? "已复制" : shareGenerating ? "生成中" : "复制链接"}
              </button>
              <button className="primary-btn" disabled={!shareUrl || shareGenerating} onClick={shareViaSystem} type="button">
                系统分享
              </button>
            </div>
          </div>
        ) : null}
        <div className="footer-actions">
          <Link className="secondary-btn" href="/create/content">
            返回编辑
          </Link>
          <button className="primary-btn" disabled={shareGenerating} onClick={openShare} type="button">
            {shareGenerating ? "生成中..." : "完成并分享"}
          </button>
        </div>
      </div>
    </main>
  );
}
