import { NextResponse } from "next/server";
import { getSupabaseAdmin, cloudUnconfiguredMessage } from "@/lib/supabaseAdmin";

const allowedTypes = {
  audio: new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac"])
};

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
  if (contentType === "audio/mp4" || contentType === "audio/aac") return "m4a";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "bin";
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ message: cloudUnconfiguredMessage }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { dataUrl?: string; kind?: "image" | "audio" } | null;
  if (!body?.dataUrl || (body.kind !== "image" && body.kind !== "audio")) {
    return NextResponse.json({ message: "上传参数无效。" }, { status: 400 });
  }

  const parsed = parseDataUrl(body.dataUrl);
  if (!parsed) {
    return NextResponse.json({ message: "上传资源格式无效。" }, { status: 400 });
  }

  if (body.kind === "image" && !parsed.contentType.startsWith("image/")) {
    return NextResponse.json({ message: "请上传图片文件。" }, { status: 400 });
  }

  if (body.kind === "audio" && !allowedTypes.audio.has(parsed.contentType)) {
    return NextResponse.json({ message: "请上传 mp3 / wav / m4a 格式音频。" }, { status: 400 });
  }

  const maxBytes = body.kind === "image" ? 5 * 1024 * 1024 : 15 * 1024 * 1024;
  if (parsed.bytes.byteLength > maxBytes) {
    return NextResponse.json({ message: body.kind === "image" ? "图片超过 5MB。" : "音频超过 15MB。" }, { status: 400 });
  }

  const path = `${body.kind}/${Date.now().toString(36)}-${crypto.randomUUID()}.${extensionFor(parsed.contentType)}`;
  const { error } = await admin.client.storage.from(admin.bucket).upload(path, parsed.bytes, {
    contentType: parsed.contentType,
    upsert: false
  });

  if (error) {
    return NextResponse.json({ message: `上传到云端失败：${error.message}` }, { status: 500 });
  }

  const { data } = admin.client.storage.from(admin.bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
