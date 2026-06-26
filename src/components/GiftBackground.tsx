"use client";

import type { CSSProperties } from "react";
import { GiftDraft, themes } from "@/lib/gift";

export function GiftBackground({ gift }: { gift: GiftDraft }) {
  const theme = themes[gift.theme];
  const backgroundImageUrl = gift.backgroundImageUrl || theme.backgroundImage;
  const backgroundPositionX = gift.backgroundImageUrl ? (gift.backgroundPositionX ?? 50) : theme.backgroundPositionX;
  const backgroundPositionY = gift.backgroundImageUrl ? (gift.backgroundPositionY ?? 50) : theme.backgroundPositionY;
  const backgroundScale = gift.backgroundImageUrl ? (gift.backgroundScale ?? 100) : theme.backgroundScale;

  return (
    <div
      className="gift-bg"
      style={
        {
          "--theme-wash": theme.wash,
          "--image-wash": "transparent",
          "--theme-glow": theme.glow,
          backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : theme.gradient,
          backgroundPosition: backgroundImageUrl ? `${backgroundPositionX}% ${backgroundPositionY}%` : "center",
          backgroundSize: backgroundImageUrl ? `auto ${backgroundScale}%` : "cover",
          backgroundRepeat: "no-repeat"
        } as CSSProperties
      }
    />
  );
}
