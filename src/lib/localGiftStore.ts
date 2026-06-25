import { GiftDraft } from "./gift";

const dbName = "bloombeat";
const storeName = "gifts";
const draftId = "__draft__";
const dbTimeoutMs = 1800;
const memoryGifts = new Map<string, GiftDraft>();

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
      request.onsuccess = () => resolve((request.result as GiftDraft | undefined) ?? memoryGifts.get(id) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return memoryGifts.get(id) ?? null;
  }
}

export async function getLocalDraft() {
  return getLocalGift(draftId);
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
