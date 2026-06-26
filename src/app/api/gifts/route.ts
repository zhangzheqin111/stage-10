import { NextResponse } from "next/server";
import { GiftDraft } from "@/lib/gift";
import { getSupabaseAdmin, cloudUnconfiguredMessage } from "@/lib/supabaseAdmin";

function createGiftId() {
  return `gift-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

function resolveCloudGiftId(id?: string) {
  if (id?.startsWith("gift-")) {
    return id;
  }
  return createGiftId();
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ message: cloudUnconfiguredMessage }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { gift?: GiftDraft } | null;
  if (!body?.gift?.title || !body.gift.songTitle || !body.gift.blessingText) {
    return NextResponse.json({ message: "礼物数据不完整。" }, { status: 400 });
  }

  const id = resolveCloudGiftId(body.gift.id);
  const gift: GiftDraft = { ...body.gift, id, createdAt: body.gift.createdAt || new Date().toISOString() };
  const { error } = await admin.client.from("gifts").upsert({ id, gift }, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ message: `保存云端礼物失败：${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ id, gift });
}
