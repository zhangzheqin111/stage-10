/**
 * 自包含礼物链接编解码。
 * 将 GiftDraft 编码为 URL hash，使链接可不依赖云存储独立流转。
 */

import type { GiftDraft } from "./gift";
import { defaultGift, themes } from "./gift";

const HASH_PREFIX = "bloombeat=";

/**
 * 清洗草稿：确保所有字段都有合法值。
 */
function sanitizeDraft(draft: GiftDraft): GiftDraft {
  const theme = themes[draft.theme] ? draft.theme : "sakura";
  return {
    ...draft,
    recipientName: String(draft.recipientName ?? ""),
    title: String(draft.title ?? ""),
    songSourceType: draft.songSourceType || "default",
    songTitle: String(draft.songTitle ?? ""),
    artist: String(draft.artist ?? ""),
    bgmPresetId: draft.bgmPresetId || undefined,
    audioUrl: draft.audioUrl || undefined,
    backgroundImageUrl: draft.backgroundImageUrl || undefined,
    backgroundPositionX: Number.isFinite(draft.backgroundPositionX) ? draft.backgroundPositionX : 50,
    backgroundPositionY: Number.isFinite(draft.backgroundPositionY) ? draft.backgroundPositionY : 50,
    backgroundScale: Number.isFinite(draft.backgroundScale) ? draft.backgroundScale : 100,
    blessingText: String(draft.blessingText ?? ""),
    blessingColor: String(draft.blessingColor || themes[theme].text),
    blessingFontSize: Number.isFinite(draft.blessingFontSize) ? draft.blessingFontSize : defaultGift.blessingFontSize,
    blessingSpeed: Number.isFinite(draft.blessingSpeed) ? draft.blessingSpeed : defaultGift.blessingSpeed,
    blessingDensity: [15, 30, 50, 75].includes(draft.blessingDensity) ? draft.blessingDensity : defaultGift.blessingDensity,
    blessingLineGap: Number.isFinite(draft.blessingLineGap) ? draft.blessingLineGap : defaultGift.blessingLineGap,
    blessingMarqueeEnabled: draft.blessingMarqueeEnabled ?? defaultGift.blessingMarqueeEnabled,
    theme
  };
}

/**
 * 将 GiftDraft 编码为 URL hash 片段。
 *
 * 注意：audioUrl / backgroundImageUrl（上传的文件）base64 后通常几百 KB～几 MB，
 * 无法放进 URL，编码时会被去掉；分享链接打开时会自动降级为默认值。
 */
export function encodeDraftToHash(draft: GiftDraft): string {
  const clean = sanitizeDraft(draft);
  // 上传音频 / 自定义图片无法放进 URL，去掉以避免 URL 超长导致浏览器崩溃
  if (clean.songSourceType === "upload" && clean.audioUrl) {
    clean.audioUrl = undefined;
  }
  if (clean.backgroundImageUrl && clean.backgroundImageUrl.startsWith("data:")) {
    clean.backgroundImageUrl = undefined;
  }
  const json = JSON.stringify(clean);
  // 使用 btoa + encodeURIComponent 处理中文
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64;
}

/**
 * 从 URL hash 中解码 GiftDraft。
 * 期望格式：#bloombeat=<base64>
 */
export function decodeDraftFromHash(hash: string): GiftDraft | null {
  try {
    if (!hash) return null;

    // 去掉开头的 #
    let raw = hash;
    if (raw.startsWith("#")) {
      raw = raw.slice(1);
    }

    if (!raw.startsWith(HASH_PREFIX)) return null;

    const base64 = raw.slice(HASH_PREFIX.length);
    if (!base64) return null;

    const json = decodeURIComponent(escape(atob(base64)));
    const draft = JSON.parse(json) as GiftDraft;

    // 基本校验
    if (!draft || typeof draft !== "object") return null;
    if (typeof draft.title !== "string" || typeof draft.recipientName !== "string") return null;

    return sanitizeDraft(draft);
  } catch (err) {
    console.warn("[giftCodec] 解码礼物链接失败", err);
    return null;
  }
}

/**
 * 构造自包含分享链接。
 */
export function buildShareUrl(draft: GiftDraft, origin: string): string {
  const hashData = encodeDraftToHash(draft);
  return `${origin}/gift/share#${HASH_PREFIX}${hashData}`;
}
