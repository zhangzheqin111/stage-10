import { NextResponse } from "next/server";
import { getServerMedia } from "@/lib/serverMediaStore";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const media = await getServerMedia(id);

  if (!media) {
    return NextResponse.json({ message: "没有找到这个媒体资源。" }, { status: 404 });
  }

  return new NextResponse(media.bytes, {
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
