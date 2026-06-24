import { GiftDraft } from "./gift";

export type CloudGiftResult =
  | { ok: true; gift: GiftDraft }
  | { ok: false; reason: "unconfigured" | "missing" | "error"; message: string };

async function uploadDataUrl(dataUrl: string, kind: "image" | "audio") {
  if (!dataUrl.startsWith("data:")) {
    return dataUrl;
  }

  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, kind })
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "上传资源失败。");
  }

  return String(payload.url);
}

export async function saveCloudGift(draft: GiftDraft) {
  const [audioUrl, backgroundImageUrl] = await Promise.all([
    draft.audioUrl ? uploadDataUrl(draft.audioUrl, "audio") : Promise.resolve(undefined),
    draft.backgroundImageUrl ? uploadDataUrl(draft.backgroundImageUrl, "image") : Promise.resolve(undefined)
  ]);
  const cloudGift = { ...draft, audioUrl, backgroundImageUrl };

  const response = await fetch("/api/gifts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gift: cloudGift })
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "保存云端礼物失败。");
  }

  return { id: String(payload.id), gift: payload.gift as GiftDraft };
}

export async function getCloudGift(id: string): Promise<CloudGiftResult> {
  const response = await fetch(`/api/gifts/${encodeURIComponent(id)}`);
  const payload = await response.json().catch(() => ({}));

  if (response.ok) {
    return { ok: true, gift: payload.gift as GiftDraft };
  }

  if (response.status === 404) {
    return { ok: false, reason: "missing", message: payload.message || "没有找到云端礼物。" };
  }

  if (response.status === 503) {
    return { ok: false, reason: "unconfigured", message: payload.message || "云端分享未配置。" };
  }

  return { ok: false, reason: "error", message: payload.message || "读取云端礼物失败。" };
}
