import { NextResponse } from "next/server";
import { parseMockMusicLink } from "@/lib/mockMusic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  const url = body?.url?.trim();

  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        message: "请先粘贴 QQ 音乐或酷狗歌曲链接。",
        fallback: "search"
      },
      { status: 400 }
    );
  }

  const result = parseMockMusicLink(url);
  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      message: result.message,
      fallback: "search"
    });
  }

  return NextResponse.json({
    ok: true,
    track: {
      ...result.track,
      sourceUrl: url
    },
    message: result.message
  });
}
