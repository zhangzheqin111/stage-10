import { NextResponse } from "next/server";
import { GiftDraft } from "@/lib/gift";
import { getSupabaseAdmin, cloudUnconfiguredMessage } from "@/lib/supabaseAdmin";

function createGiftId() {
  return `gift-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ message: cloudUnconfiguredMessage }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { gift?: GiftDraft } | null;
  if (!body?.gift?.recipientName || !body.gift.title || !body.gift.songTitle || !body.gift.blessingText) {
    return NextResponse.json({ message: "礼物数据不完整。" }, { status: 400 });
  }

  const id = body.gift.id || createGiftId();
  const gift: GiftDraft = { ...body.gift, id, createdAt: body.gift.createdAt || new Date().toISOString() };
  const { error } = await admin.client.from("gifts").insert({ id, gift });

  if (error) {
    return NextResponse.json({ message: `保存云端礼物失败：${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ id, gift });
}
