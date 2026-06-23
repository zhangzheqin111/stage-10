"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GiftExperience } from "@/components/GiftExperience";
import { GiftDraft, getDraft } from "@/lib/gift";
import { getLocalDraft, getLocalGift } from "@/lib/localGiftStore";

export default function GiftPage() {
  const [gift, setGift] = useState<GiftDraft | null>(null);
  const [missing, setMissing] = useState(false);
  const params = useParams<{ id: string }>();

  useEffect(() => {
    async function loadGift() {
      if (params.id === "demo") {
        setGift((await getLocalDraft()) ?? getDraft());
        return;
      }

      const savedGift = await getLocalGift(params.id);
      if (savedGift) {
        setGift(savedGift);
      } else {
        setMissing(true);
      }
    }

    loadGift().catch(() => setMissing(true));
  }, [params.id]);

  if (missing) {
    return (
      <main className="app-shell">
        <div className="phone-frame">
          <section className="section soft-card stack">
            <h1>没有找到这份礼物</h1>
            <p className="lead">阶段 2 本地模式下，礼物链接需要在同一台设备和同一浏览器中打开。</p>
          </section>
        </div>
      </main>
    );
  }

  if (!gift) {
    return null;
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <GiftExperience gift={gift} />
      </div>
    </main>
  );
}
