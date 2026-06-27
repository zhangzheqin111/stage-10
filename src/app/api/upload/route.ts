import { NextResponse } from "next/server";
import { getSupabaseAdmin, cloudUnconfiguredMessage } from "@/lib/supabaseAdmin";
import { saveServerMedia } from "@/lib/serverMediaStore";

const allowedTypes = {
  audio: new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/m4a", "audio/x-m4a"])
};

const maxUploadBytes = {
  image: 8 * 1024 * 1024,
  audio: 10 * 1024 * 1024
} as const;

function isValidKind(value: unknown): value is "image" | "audio" {
  return value === "image" || value === "audio";
}

function parseDataUrl(dataUrl: string) {
  const [metadata, base64] = dataUrl.split(",");
  const contentType = metadata.match(/^data:(.*?);base64$/)?.[1];

  if (!contentType || !base64) {
    return null;
  }

  const bytes = Buffer.from(base64, "base64");
  return { contentType, bytes };
}

function extensionFor(contentType: string) {
  if (contentType === "audio/mpeg") return "mp3";
  if (contentType === "audio/wav" || contentType === "audio/x-wav") return "wav";
  if (contentType === "audio/mp4" || contentType === "audio/aac" || contentType === "audio/m4a" || contentType === "audio/x-m4a") return "m4a";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "bin";
}

function validateUpload(kind: "image" | "audio", contentType: string, size: number) {
  if (kind === "image" && !contentType.startsWith("image/")) {
    return "请上传图片文件。";
  }

  if (kind === "audio" && !allowedTypes.audio.has(contentType)) {
    return "请上传 mp3 / wav / m4a 格式音频。";
  }

  if (size > maxUploadBytes[kind]) {
    return kind === "image" ? "图片超过 8MB。" : "音频超过 10MB。";
  }

  return "";
}

async function uploadBytes(kind: "image" | "audio", contentType: string, bytes: Buffer) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ message: cloudUnconfiguredMessage }, { status: 503 });
  }

  const validationMessage = validateUpload(kind, contentType, bytes.byteLength);
  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const path = `${kind}/${Date.now().toString(36)}-${crypto.randomUUID()}.${extensionFor(contentType)}`;
  const { error } = await admin.client.storage.from(admin.bucket).upload(path, bytes, {
    contentType,
    upsert: false
  });

  if (error) {
    return NextResponse.json({ message: `上传到云端失败：${error.message}` }, { status: 500 });
  }

  const { data } = admin.client.storage.from(admin.bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path, storage: "supabase" });
}

async function uploadFastServerMedia(request: Request, kind: "image" | "audio", contentType: string, bytes: Buffer) {
  const validationMessage = validateUpload(kind, contentType, bytes.byteLength);
  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const mediaId = await saveServerMedia(bytes, contentType, extensionFor(contentType));
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin;
  return NextResponse.json({ url: `${origin}/api/media/${mediaId}`, path: mediaId, storage: "server" });
}

function shouldUseServerMedia(request: Request) {
  if (request.headers.get("x-bloombeat-fast-media") !== "1") {
    return false;
  }

  return process.env.BLOOMBEAT_SERVER_MEDIA_ENABLED === "1" || !getSupabaseAdmin();
}

export async function POST(request: Request) {
  const requestContentType = request.headers.get("content-type") || "";

  if (requestContentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const kind = form?.get("kind");
    const file = form?.get("file");

    if (!isValidKind(kind) || !(file instanceof File)) {
      return NextResponse.json({ message: "上传参数无效。" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";
    if (shouldUseServerMedia(request)) {
      return uploadFastServerMedia(request, kind, contentType, bytes);
    }
    return uploadBytes(kind, contentType, bytes);
  }

  const body = (await request.json().catch(() => null)) as { dataUrl?: string; kind?: "image" | "audio" } | null;
  if (!body?.dataUrl || (body.kind !== "image" && body.kind !== "audio")) {
    return NextResponse.json({ message: "上传参数无效。" }, { status: 400 });
  }

  const parsed = parseDataUrl(body.dataUrl);
  if (!parsed) {
    return NextResponse.json({ message: "上传资源格式无效。" }, { status: 400 });
  }

  return uploadBytes(body.kind, parsed.contentType, parsed.bytes);
}
