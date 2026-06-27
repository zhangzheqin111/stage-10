import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const mediaDir = path.join(process.cwd(), ".data", "media");
const mediaIndexFile = path.join(mediaDir, "index.json");

type MediaRecord = {
  contentType: string;
  fileName: string;
};

type MediaIndex = Record<string, MediaRecord>;

async function readIndex(): Promise<MediaIndex> {
  try {
    const raw = await readFile(mediaIndexFile, "utf8");
    return JSON.parse(raw) as MediaIndex;
  } catch {
    return {};
  }
}

async function writeIndex(index: MediaIndex) {
  await mkdir(mediaDir, { recursive: true });
  await writeFile(mediaIndexFile, JSON.stringify(index), "utf8");
}

export async function saveServerMedia(bytes: Buffer, contentType: string, extension: string) {
  await mkdir(mediaDir, { recursive: true });
  const id = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
  const fileName = path.join(mediaDir, id);
  await writeFile(fileName, bytes);

  const index = await readIndex();
  index[id] = { contentType, fileName: id };
  await writeIndex(index);

  return id;
}

export async function getServerMedia(id: string) {
  const safeId = path.basename(id);
  const index = await readIndex();
  const record = index[safeId];
  if (!record) {
    return null;
  }

  try {
    const bytes = await readFile(path.join(mediaDir, record.fileName));
    return { bytes, contentType: record.contentType };
  } catch {
    return null;
  }
}
