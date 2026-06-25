import { GiftDraft } from "./gift";

const dbName = "bloombeat";
const storeName = "gifts";
const draftId = "__draft__";
const dbTimeoutMs = 1800;
const memoryGifts = new Map<string, GiftDraft>();

/**
 * 预览页跳转时把完整 draft（含音频/图片 data URL）暂存到 window。
 * 同一浏览器 session 内的所有页面都可以读到，用于解决
 * "IndexedDB 异步失败 / localStorage 容量限制 / 跨页数据传递丢失"导致的
 * 礼物页加载不出用户上传资源的问题。
 */
type WindowWithDraft = Window & { __bloombeatPreviewDraft?: GiftDraft | null };

export function setPreviewDraftCache(draft: GiftDraft | null) {
  if (typeof window === "undefined") return;
  (window as WindowWithDraft).__bloombeatPreviewDraft = draft;
}

export function getPreviewDraftCache(): GiftDraft | null {
  if (typeof window === "undefined") return null;
  return (window as WindowWithDraft).__bloombeatPreviewDraft ?? null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const timeout = window.setTimeout(() => {
      reject(new Error("IndexedDB open timed out."));
    }, dbTimeoutMs);
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: "id" });
    };
    request.onsuccess = () => {
      window.clearTimeout(timeout);
      resolve(request.result);
    };
    request.onerror = () => {
      window.clearTimeout(timeout);
      reject(request.error);
    };
  });
}

export function createGiftId() {
  return `gift-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveLocalGift(gift: GiftDraft) {
  if (gift.id) {
    memoryGifts.set(gift.id, gift);
  } else {
    memoryGifts.set(draftId, gift);
  }

  // 同步更新 window 全局缓存，让"在 tab 内任意页面都能立刻读到最新 draft"
  if (typeof window !== "undefined" && (gift.id === draftId || !gift.id)) {
    setPreviewDraftCache(gift);
  }

  try {
    const db = await openDb();
    return await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(gift);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    // Keep the in-memory copy so the current mobile flow can continue even when storage is restricted.
  }
}

export async function saveLocalDraft(gift: GiftDraft) {
  await saveLocalGift({ ...gift, id: draftId });
}

export async function getLocalGift(id: string) {
  try {
    const db = await openDb();
    return await new Promise<GiftDraft | null>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).get(id);
      request.onsuccess = () => resolve((request.result as GiftDraft | undefined) ?? memoryGifts.get(id) ?? getPreviewDraftCacheIfMatches(id) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    // IndexedDB 失败时，先查内存，再查 window 全局草稿（preview 页跳转时存进去的）
    return memoryGifts.get(id) ?? getPreviewDraftCacheIfMatches(id) ?? null;
  }
}

export async function getLocalDraft() {
  return getLocalGift(draftId);
}

function getPreviewDraftCacheIfMatches(id: string): GiftDraft | null {
  if (id !== draftId) return null;
  return getPreviewDraftCache();
}

export async function clearLocalDraft() {
  memoryGifts.delete(draftId);

  try {
    const db = await openDb();
    return await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).delete(draftId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    // A failed storage clear should not block starting a new gift.
  }
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * 压缩图片到合理尺寸，使 Data URL 可控在 ~50KB 以内，避免 localStorage 超限被静默丢弃。
 * - maxWidth: 图片最大宽度（默认 800px，移动端足够用）
 * - quality: JPEG 压缩质量（默认 0.75，视觉损失极小）
 * - 返回 JPEG Data URL
 */
export function compressImage(file: File, maxWidth = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    // 小文件（<80KB）且格式不是巨大位图则直接返回，不损失质量
    if (file.size < 80 * 1024 && !/\.(bmp)$/i.test(file.name)) {
      fileToDataUrl(file).then(resolve).catch(reject);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // 等比缩放到 maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Canvas 不可用时降级为原始 Data URL
          fileToDataUrl(file).then(resolve).catch(reject);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => {
        // 图片加载失败时降级为原始 Data URL
        fileToDataUrl(file).then(resolve).catch(reject);
      };
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
