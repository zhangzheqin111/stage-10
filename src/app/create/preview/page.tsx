"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { GiftExperience } from "@/components/GiftExperience";
import { GiftDraft, getDraft } from "@/lib/gift";

export default function PreviewPage() {
  const [draft, setDraft] = useState<GiftDraft | null>(null);

  useEffect(() => {
    setDraft(getDraft());
  }, []);

  if (!draft) {
    return null;
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <AppHeader step="3 / 3 预览" />
        <GiftExperience gift={draft} />
        <div className="footer-actions">
          <Link className="secondary-btn" href="/create/content">
            返回编辑
          </Link>
          <Link className="primary-btn" href="/gift/demo">
            查看礼物页
          </Link>
        </div>
      </div>
    </main>
  );
}
