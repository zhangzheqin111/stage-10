import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerGift } from "@/lib/serverGiftStore";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const localGift = await getServerGift(id);
  if (localGift) {
    return NextResponse.json({ gift: localGift });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ message: "没有找到这份礼物。" }, { status: 404 });
  }

  const { data, error } = await admin.client.from("gifts").select("gift").eq("id", id).maybeSingle();

  if (error) {
    return NextResponse.json({ message: `读取礼物失败：${error.message}` }, { status: 500 });
  }

  if (!data?.gift) {
    return NextResponse.json({ message: "没有找到这份礼物。" }, { status: 404 });
  }

  return NextResponse.json({ gift: data.gift });
}
