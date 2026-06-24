import { NextResponse } from "next/server";
import { searchMockMusic } from "@/lib/mockMusic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { keyword?: string } | null;
  const keyword = body?.keyword?.trim() ?? "";

  return NextResponse.json({
    tracks: searchMockMusic(keyword).slice(0, 3),
    fallback: "default",
    message: "当前返回内置推荐，真实音乐 API 不可用时可继续选择系统 BGM。"
  });
}
