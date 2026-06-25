"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { GiftBackground } from "@/components/GiftBackground";
import { shouldStartFromGuide, startCreationFlow } from "@/lib/creationFlow";
import { GiftDraft, getDraft, normalizeBlessing, normalizeRecipientName, saveDraft, themes, ThemeKey } from "@/lib/gift";
import { fileToDataUrl, getLocalDraft, saveLocalDraft } from "@/lib/localGiftStore";

const blessingColorSwatches = ["#c7608a", "#5f9d6d", "#c99542", "#6b8fc7", "#ffffff", "#43343c"];

function canUseImageFile(file: File) {
  const normalizedName = file.name.toLowerCase();
  return file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/.test(normalizedName);
}

export default function ContentPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<GiftDraft>(getDraft());
  const [imageMessage, setImageMessage] = useState("");
  const [colorMessage, setColorMessage] = useState("");
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (shouldStartFromGuide()) {
      router.replace("/");
      return;
    }

    getLocalDraft()
      .then((savedDraft) => {
        const baseDraft = (savedDraft ?? getDraft()) as GiftDraft;
        setDraft(baseDraft);
        saveDraft(baseDraft);
        void saveLocalDraft(baseDraft);
      })
      .catch(() => setDraft(getDraft()));
  }, [router]);

  function update(next: Partial<GiftDraft>) {
    const merged = { ...draft, ...next };
    if (next.recipientName !== undefined) {
      merged.recipientName = normalizeRecipientName(next.recipientName);
      merged.title = `给${merged.recipientName}的礼物`;
    }
    if (next.blessingText !== undefined) {
      merged.blessingText = normalizeBlessing(next.blessingText);
    }
    startCreationFlow();
    setDraft(merged);
    saveDraft(merged);
    void saveLocalDraft(merged);
  }

  async function handleImageUpload(file?: File) {
    if (!file) {
      return;
    }

    if (!canUseImageFile(file)) {
      setImageMessage("请上传图片文件。");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageMessage("图片超过 5MB，请压缩后再上传。");
      return;
    }

    setImageMessage("正在读取图片...");

    try {
      const backgroundImageUrl = await fileToDataUrl(file);
      update({ backgroundImageUrl, backgroundPositionX: 50, backgroundPositionY: 0, backgroundScale: 100 });
      setImageMessage("背景图片已保存到礼物草稿。");
    } catch {
      setImageMessage("图片读取失败，请重新选择图片。");
    }
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <AppHeader step="2 / 3 礼物内容" />
        <section className="section soft-card stack">
          <div>
            <h1>花之物语：把心声装进礼物</h1>
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
            <p className="hint">最多15字，不填时默认为TA。</p>
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
            <input
              className="input"
              accept="image/*"
              onChange={(event) => handleImageUpload(event.target.files?.[0])}
              type="file"
            />
            <p className="hint">可上传 5MB 以内图片；不上传时默认为纯色主题背景。</p>
            {imageMessage ? <p className="hint">{imageMessage}</p> : null}
            <div className="image-crop-control">
              <div
                className={`image-crop-preview ${draft.backgroundImageUrl ? "" : "empty"}`}
              >
                {draft.backgroundImageUrl ? <GiftBackground gift={draft} /> : <span>图片预览栏</span>}
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
                  onClick={() =>
                    update({
                      backgroundImageUrl: undefined,
                      backgroundPositionX: 50,
                      backgroundPositionY: 0,
                      backgroundScale: 100
                    })
                  }
                  type="button"
                >
                  使用纯色主题背景
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
            <Link className="primary-btn" href="/create/preview">
              预览礼物
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
