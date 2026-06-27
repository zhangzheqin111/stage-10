import { NextResponse } from "next/server";
import { GiftDraft } from "@/lib/gift";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { saveServerGift } from "@/lib/serverGiftStore";

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
  const body = (await request.json().catch(() => null)) as { gift?: GiftDraft } | null;
  if (!body?.gift?.title || !body.gift.songTitle || !body.gift.blessingText) {
    return NextResponse.json({ message: "礼物数据不完整。" }, { status: 400 });
  }

  const id = resolveCloudGiftId(body.gift.id);
  const gift: GiftDraft = { ...body.gift, id, createdAt: body.gift.createdAt || new Date().toISOString() };

  await saveServerGift(id, gift);

  const admin = getSupabaseAdmin();
  if (admin) {
    admin.client.from("gifts").upsert({ id, gift }, { onConflict: "id" }).then(({ error }) => {
      if (error) {
        console.warn("[gifts] Supabase background save failed", error.message);
      }
    });
  }

  return NextResponse.json({ id, gift });
}
