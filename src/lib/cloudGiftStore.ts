import { GiftDraft } from "./gift";

export type CloudGiftResult =
  | { ok: true; gift: GiftDraft }
  | { ok: false; reason: "unconfigured" | "missing" | "error"; message: string };

export class CloudGiftSaveError extends Error {
  phase: "upload" | "save";
  status?: number;

  constructor(message: string, phase: "upload" | "save", status?: number) {
    super(message);
    this.name = "CloudGiftSaveError";
    this.phase = phase;
    this.status = status;
  }
}

export type CloudGiftSaveProgress = "upload-audio" | "upload-image" | "save-gift";

function isDataUrl(value?: string) {
  return Boolean(value?.startsWith("data:"));
}

export async function uploadCloudResource(dataUrl: string, kind: "image" | "audio") {
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
    throw new CloudGiftSaveError(payload.message || "礼物还没有准备好。", "upload", response.status);
  }

  return String(payload.url);
}

export async function uploadCloudFile(file: File, kind: "image" | "audio") {
  const formData = new FormData();
  formData.append("kind", kind);
  formData.append("file", file);

  const headers: HeadersInit = {};
  if (process.env.NEXT_PUBLIC_BLOOMBEAT_FAST_MEDIA === "1") {
    headers["x-bloombeat-fast-media"] = "1";
  }

  const response = await fetch("/api/upload", {
    method: "POST",
    headers,
    body: formData
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new CloudGiftSaveError(payload.message || "礼物还没有准备好。", "upload", response.status);
  }

  return String(payload.url);
}

export async function saveCloudGift(draft: GiftDraft, onProgress?: (progress: CloudGiftSaveProgress) => void) {
  let audioUrl: string | undefined;
  let backgroundImageUrl: string | undefined;

  if (draft.audioUrl) {
    if (isDataUrl(draft.audioUrl)) {
      onProgress?.("upload-audio");
    }
    audioUrl = await uploadCloudResource(draft.audioUrl, "audio");
  }

  if (draft.backgroundImageUrl) {
    if (isDataUrl(draft.backgroundImageUrl)) {
      onProgress?.("upload-image");
    }
    backgroundImageUrl = await uploadCloudResource(draft.backgroundImageUrl, "image");
  }

  const cloudGift = { ...draft, audioUrl, backgroundImageUrl };

  onProgress?.("save-gift");
  const response = await fetch("/api/gifts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gift: cloudGift })
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new CloudGiftSaveError(payload.message || "礼物链接生成失败。", "save", response.status);
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
    return { ok: false, reason: "missing", message: payload.message || "没有找到这份礼物。" };
  }

  if (response.status === 503) {
    return { ok: false, reason: "unconfigured", message: payload.message || "分享服务还没有配置。" };
  }

  return { ok: false, reason: "error", message: payload.message || "读取礼物失败。" };
}
