"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { GiftBackground } from "@/components/GiftBackground";
import { shouldStartFromGuide, startCreationFlow } from "@/lib/creationFlow";
import { GiftDraft, getDraft, normalizeBlessing, saveDraft, themes, ThemeKey } from "@/lib/gift";
import { compressImage, getLocalDraft, saveLocalDraft } from "@/lib/localGiftStore";
import { prepareCloudResourceOnce } from "@/lib/mediaPreparation";

const blessingColorSwatches = ["#c7608a", "#5f9d6d", "#c99542", "#6b8fc7", "#ffffff", "#43343c"];
const maxBackgroundUploadSize = 8 * 1024 * 1024;
const maxBackgroundUploadSizeLabel = "8MB";

function mergeDraftWithLargeResources(savedDraft: GiftDraft | null, localDraft: GiftDraft) {
  if (!savedDraft) {
    return localDraft;
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

  return mergedDraft;
}

function canUseImageFile(file: File) {
  // Mobile browsers sometimes omit file.type, so prefer extension checks.
  const normalizedName = file.name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|heic|heif|svg)$/.test(normalizedName)) {
    return true;
  }
  // Otherwise use MIME type when available.
  if (file.type && file.type.startsWith("image/")) {
    return true;
  }
  // Empty MIME with a non-empty file is common for mobile image pickers.
  if (!file.type && file.size > 0) {
    return true;
  }
  return false;
}

export default function ContentPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<GiftDraft>(getDraft());
  const [imageMessage, setImageMessage] = useState("");
  const [imagePreparing, setImagePreparing] = useState(false);
  const [imageFileName, setImageFileName] = useState("");
  const [colorMessage, setColorMessage] = useState("");
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (shouldStartFromGuide()) {
      router.replace("/");
      return;
    }

    const baseDraft = getDraft();
    setDraft(baseDraft);
    getLocalDraft()
      .then((savedDraft) => {
        setDraft(mergeDraftWithLargeResources(savedDraft, getDraft()));
      })
      .catch(() => undefined);
  }, [router]);

  function update(next: Partial<GiftDraft>) {
    const merged = { ...draft, ...next };
    if (next.recipientName !== undefined) {
      const editableName = next.recipientName.slice(0, 15);
      const displayName = editableName.trim() || "TA";
      merged.recipientName = editableName;
      merged.title = `给${displayName}的礼物`;
    }
    if (next.blessingText !== undefined) {
      merged.blessingText = normalizeBlessing(next.blessingText);
    }
    startCreationFlow();
    setDraft(merged);
    // Persist draft to both localStorage and IndexedDB.
    saveDraft(merged);
    saveLocalDraft(merged).catch(() => undefined);
  }

  async function handleImageUpload(file?: File) {
    if (!file) {
      return;
    }

    if (!canUseImageFile(file)) {
      setImageMessage("请上传图片文件。");
      return;
    }

    if (file.size > maxBackgroundUploadSize) {
      setImageMessage(`图片超过 ${maxBackgroundUploadSizeLabel}，请压缩后再上传。`);
      return;
    }

    setImageMessage("正在准备图片...");
    setImagePreparing(true);

    try {
      const localBackgroundImageUrl = await compressImage(file, 640, 0.66);
      update({ backgroundImageUrl: localBackgroundImageUrl, backgroundPositionX: 50, backgroundPositionY: 50, backgroundScale: 100 });
      setImageFileName(file.name);
      setImageMessage("正在准备图片...");

      const cloudBackgroundImageUrl = await prepareCloudResourceOnce(localBackgroundImageUrl, "image");
      update({ backgroundImageUrl: cloudBackgroundImageUrl, backgroundPositionX: 50, backgroundPositionY: 50, backgroundScale: 100 });
      setImageMessage("图片已准备好，生成链接时会更快。");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知错误";
      setImageMessage(`图片准备失败：${msg}。请重新选择 ${maxBackgroundUploadSizeLabel} 以内的常见图片格式，或稍后再试。`);
    } finally {
      setImagePreparing(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <AppHeader step="2 / 3 礼物内容" />
        <section
          className="section soft-card stack"
          style={
            {
              "--theme-accent": themes[draft.theme].accent,
              "--theme-wash": themes[draft.theme].wash
            } as CSSProperties
          }
        >
          <div>
            <h1 className="page-title">花之物语：把心声装进礼物</h1>
            <p className="lead">创造你的个性化礼物</p>
          </div>

          <div className="field">
            <label>心里的TA（对方称呼）</label>
            <input
              className="input"
              maxLength={15}
              onChange={(event) => update({ recipientName: event.target.value })}
              placeholder="TA"
              value={draft.recipientName}
            />
            <p className="hint">最多 15 字，可清空；预览时会默认显示为 TA。</p>
          </div>

          <div className="field">
            <label>祝福语</label>
            <textarea
              className="textarea"
              maxLength={50}
              onChange={(event) => update({ blessingText: event.target.value })}
              value={draft.blessingText}
            />
            <p className="hint">{draft.blessingText.length} / 50 字</p>
          </div>

          <div className="field">
            <label>背景图片</label>
            <label className="upload-image-box">
              <input
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setImageFileName(file?.name ?? "");
                  handleImageUpload(file);
                }}
                type="file"
              />
              <span className="upload-image-glyph" aria-hidden="true">+</span>
              <span className="upload-image-label">{imageFileName || "点击上传背景图片"}</span>
            </label>
            <p className="hint">可上传 {maxBackgroundUploadSizeLabel} 以内图片；不上传时默认使用当前主题背景。</p>
            {imageMessage ? <p className="hint">{imageMessage}</p> : null}
            <div className="image-crop-control">
              <div
                className={`image-crop-preview ${draft.backgroundImageUrl ? "" : "empty"}`}
              >
                <GiftBackground gift={draft} />
                {!draft.backgroundImageUrl ? (
                  <div className="theme-background-note">
                    <strong>当前主题默认背景</strong>
                    <p className="hint">上传图片后会替换这张系统背景。</p>
                  </div>
                ) : null}
              </div>
              {draft.backgroundImageUrl ? (
                <>
                <label>
                  左右位置：{draft.backgroundPositionX}%
                  <input
                    className="range"
                    max={100}
                    min={0}
                    onChange={(event) => update({ backgroundPositionX: Number(event.target.value) })}
                    type="range"
                    value={draft.backgroundPositionX}
                  />
                </label>
                <label>
                  上下位置：{draft.backgroundPositionY}%
                  <input
                    className="range"
                    max={100}
                    min={0}
                    onChange={(event) => update({ backgroundPositionY: Number(event.target.value) })}
                    type="range"
                    value={draft.backgroundPositionY}
                  />
                </label>
                <label>
                  比例：{draft.backgroundScale}%
                  <input
                    className="range"
                    max={220}
                    min={50}
                    onChange={(event) => update({ backgroundScale: Number(event.target.value) })}
                    type="range"
                    value={draft.backgroundScale}
                  />
                </label>
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setImageFileName("");
                    update({
                      backgroundImageUrl: undefined,
                      backgroundPositionX: 50,
                      backgroundPositionY: 50,
                      backgroundScale: 100
                    });
                  }}
                  type="button"
                >
                  恢复主题默认背景
                </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="field">
            <span className="field-title">选择主题模板</span>
            <div className="grid-two">
              {(Object.keys(themes) as ThemeKey[]).map((key) => (
                <button
                  className={`option-card ${draft.theme === key ? "active" : ""}`}
                  key={key}
                  onClick={() =>
                    update({
                      theme: key,
                      blessingColor: themes[key].text
                    })
                  }
                  style={
                    {
                      "--theme-accent": themes[key].accent,
                      "--theme-wash": themes[key].wash
                    } as CSSProperties
                  }
                  type="button"
                >
                  <span className="theme-dot" style={{ background: themes[key].gradient }} />
                  <strong>{themes[key].name}</strong>
                  <p className="hint">{themes[key].scene}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>祝福字号：{draft.blessingFontSize}px</label>
            <input
              className="range"
              max={20}
              min={5}
              onChange={(event) => update({ blessingFontSize: Number(event.target.value) })}
              type="range"
              value={draft.blessingFontSize}
            />
          </div>

          <div className="field">
            <label>祝福颜色</label>
            <div className="color-tools">
              <label className="color-picker">
                <span className="color-preview" style={{ background: draft.blessingColor }} />
                <input
                  aria-label="选择祝福颜色"
                  onChange={(event) => {
                    update({ blessingColor: event.target.value });
                    setColorMessage("");
                  }}
                  ref={colorInputRef}
                  type="color"
                  value={draft.blessingColor}
                />
                <span>{draft.blessingColor.toUpperCase()}</span>
              </label>
              <button className="secondary-btn color-pick-btn" onClick={() => colorInputRef.current?.click()} type="button">
                更多颜色
              </button>
            </div>
            <div className="color-swatches" aria-label="常用祝福颜色">
              {blessingColorSwatches.map((color) => (
                <button
                  className={`color-swatch ${draft.blessingColor.toLowerCase() === color ? "active" : ""}`}
                  key={color}
                  onClick={() => {
                    update({ blessingColor: color });
                    setColorMessage("");
                  }}
                  style={{ background: color }}
                  type="button"
                  aria-label={`选择颜色 ${color}`}
                />
              ))}
            </div>
            {colorMessage ? <p className="hint">{colorMessage}</p> : null}
          </div>

          <div className="field">
            <label>流动速度：{draft.blessingSpeed.toFixed(1)}x</label>
            <input
              className="range"
              max={1.6}
              min={0.6}
              onChange={(event) => update({ blessingSpeed: Number(event.target.value) })}
              step={0.1}
              type="range"
              value={draft.blessingSpeed}
            />
            <p className="hint">默认舒缓，可手动调慢或调快。</p>
          </div>

          <div className="field">
            <label>祝福语占比</label>
            <select
              className="select"
              onChange={(event) => update({ blessingDensity: Number(event.target.value) as GiftDraft["blessingDensity"] })}
              value={draft.blessingDensity}
            >
              <option value={15}>15% · 轻轻点缀</option>
              <option value={30}>30% · 留白更多</option>
              <option value={50}>50% · 默认均衡</option>
              <option value={75}>75% · 满屏祝福</option>
            </select>
            <p className="hint">占比从页面顶部开始计算，例如 15% 表示祝福主要出现在顶部 15% 区域。</p>
          </div>

          <div className="field">
            <label>祝福语行距：{draft.blessingLineGap.toFixed(1)}x</label>
            <input
              className="range"
              max={1.2}
              min={0.5}
              onChange={(event) => update({ blessingLineGap: Number(event.target.value) })}
              step={0.1}
              type="range"
              value={draft.blessingLineGap}
            />
          </div>

          <div className="footer-actions">
            <Link className="secondary-btn" href="/create/song">
              上一步
            </Link>
            <Link
              className="primary-btn"
              href="/create/preview"
              onClick={() => {
                if (imagePreparing) {
                  setImageMessage("图片正在准备，稍后会自动用于礼物。");
                }
              }}
            >
              预览礼物
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
