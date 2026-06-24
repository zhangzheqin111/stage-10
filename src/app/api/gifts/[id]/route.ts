import { NextResponse } from "next/server";
import { getSupabaseAdmin, cloudUnconfiguredMessage } from "@/lib/supabaseAdmin";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ message: cloudUnconfiguredMessage }, { status: 503 });
  }

  const { id } = await context.params;
  const { data, error } = await admin.client.from("gifts").select("gift").eq("id", id).maybeSingle();

  if (error) {
    return NextResponse.json({ message: `读取云端礼物失败：${error.message}` }, { status: 500 });
  }

  if (!data?.gift) {
    return NextResponse.json({ message: "没有找到这份云端礼物。" }, { status: 404 });
  }

  return NextResponse.json({ gift: data.gift });
}
