"use client";

import { useEffect, useState } from "react";
import { GiftExperience } from "@/components/GiftExperience";
import { GiftDraft, getDraft } from "@/lib/gift";

export default function GiftPage() {
  const [gift, setGift] = useState<GiftDraft | null>(null);

  useEffect(() => {
    setGift(getDraft());
  }, []);

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
