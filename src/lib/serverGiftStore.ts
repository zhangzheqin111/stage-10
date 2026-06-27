import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { GiftDraft } from "./gift";

const storeDir = path.join(process.cwd(), ".data");
const storeFile = path.join(storeDir, "cloud-gifts.json");

type GiftStore = Record<string, GiftDraft>;

async function readStore(): Promise<GiftStore> {
  try {
    const raw = await readFile(storeFile, "utf8");
    return JSON.parse(raw) as GiftStore;
  } catch {
    return {};
  }
}

async function writeStore(store: GiftStore) {
  await mkdir(storeDir, { recursive: true });
  await writeFile(storeFile, JSON.stringify(store), "utf8");
}

export async function saveServerGift(id: string, gift: GiftDraft) {
  const store = await readStore();
  store[id] = gift;
  await writeStore(store);
}

export async function getServerGift(id: string) {
  const store = await readStore();
  return store[id] ?? null;
}
