import { GiftDraft } from "./gift";

const dbName = "bloombeat";
const storeName = "gifts";
const draftId = "__draft__";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createGiftId() {
  return `gift-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveLocalGift(gift: GiftDraft) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(gift);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function saveLocalDraft(gift: GiftDraft) {
  await saveLocalGift({ ...gift, id: draftId });
}

export async function getLocalGift(id: string) {
  const db = await openDb();
  return new Promise<GiftDraft | null>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(id);
    request.onsuccess = () => resolve((request.result as GiftDraft | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalDraft() {
  return getLocalGift(draftId);
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
