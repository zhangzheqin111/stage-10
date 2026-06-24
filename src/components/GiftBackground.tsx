"use client";

import type { CSSProperties } from "react";
import { GiftDraft, themes } from "@/lib/gift";

export function GiftBackground({ gift }: { gift: GiftDraft }) {
  const theme = themes[gift.theme];

  return (
    <div
      className="gift-bg"
      style={
        {
          "--theme-wash": theme.wash,
          "--image-wash": gift.backgroundImageUrl ? theme.mask : theme.wash,
          backgroundImage: gift.backgroundImageUrl ? `url(${gift.backgroundImageUrl})` : theme.gradient,
          backgroundPosition: `${gift.backgroundPositionX ?? 50}% ${gift.backgroundPositionY ?? 50}%`,
          backgroundSize: gift.backgroundImageUrl ? `auto ${gift.backgroundScale ?? 100}%` : "cover",
          backgroundRepeat: "no-repeat"
        } as CSSProperties
      }
    />
  );
}
