export type ThemeKey = "sakura" | "morning" | "cream" | "blue";

export type GiftDraft = {
  id?: string;
  recipientName: string;
  title: string;
  songSourceType: "upload" | "default" | "link" | "recommendation";
  musicSelected?: boolean;
  songTitle: string;
  artist: string;
  audioUrl?: string;
  backgroundImageUrl?: string;
  backgroundPositionX: number;
  backgroundPositionY: number;
  backgroundScale: number;
  blessingText: string;
  blessingColor: string;
  blessingFontSize: number;
  blessingSpeed: number;
  blessingDensity: 15 | 30 | 50 | 75;
  blessingLineGap: number;
  theme: ThemeKey;
  createdAt?: string;
};

export type GestureState = {
  mode: "camera" | "touch";
  type: "none" | "vertical_wave" | "horizontal_wave" | "open_hand" | "fist" | "clap";
  windPower: number;
  plantHeight: number;
  volume: number;
  flowerOpen: boolean;
  flowerColorIndex: number;
};

export const themes: Record<
  ThemeKey,
  {
    name: string;
    scene: string;
    wash: string;
    mask: string;
    gradient: string;
    text: string;
    flower: string[];
  }
> = {
  sakura: {
    name: "樱花粉",
    scene: "温柔、生日、表白",
    wash: "rgba(255, 238, 246, 0.66)",
    mask: "rgba(248, 201, 216, 0.3)",
    gradient: "linear-gradient(160deg, #ffe7ef, #fff7fb 48%, #f8d7e1)",
    text: "#c7608a",
    flower: ["#f28caf", "#f7bfd2", "#df7fa5", "#f3a7bd"]
  },
  morning: {
    name: "晨光绿",
    scene: "治愈、陪伴、鼓励",
    wash: "rgba(237, 255, 242, 0.66)",
    mask: "rgba(205, 235, 214, 0.3)",
    gradient: "linear-gradient(160deg, #e6f7d8, #fbfff7 48%, #cdebd6)",
    text: "#5f9d6d",
    flower: ["#8dd49c", "#bddf9c", "#72bd90", "#a7dcb4"]
  },
  cream: {
    name: "奶油黄",
    scene: "温暖、感谢、节日",
    wash: "rgba(255, 249, 223, 0.7)",
    mask: "rgba(247, 230, 182, 0.3)",
    gradient: "linear-gradient(160deg, #fff0ba, #fffaf0 50%, #f8df9d)",
    text: "#c99542",
    flower: ["#f5c95f", "#ffe18a", "#efb95d", "#f8d27b"]
  },
  blue: {
    name: "淡雅蓝",
    scene: "安静、晚安、思念",
    wash: "rgba(237, 246, 255, 0.7)",
    mask: "rgba(205, 223, 248, 0.3)",
    gradient: "linear-gradient(160deg, #e3efff, #fbfdff 50%, #cddff8)",
    text: "#6b8fc7",
    flower: ["#8fb5eb", "#b5cdf5", "#779cd8", "#a7c4ef"]
  }
};

export const defaultGift: GiftDraft = {
  recipientName: "TA",
  title: "给TA的礼物",
  songSourceType: "default",
  musicSelected: false,
  songTitle: "晨光花园",
  artist: "BloomBeat 默认 BGM",
  audioUrl: undefined,
  backgroundImageUrl: undefined,
  backgroundPositionX: 50,
  backgroundPositionY: 0,
  backgroundScale: 100,
  blessingText: "愿今天的风和花，都把温柔送到你身边。",
  blessingColor: "#c7608a",
  blessingFontSize: 16,
  blessingSpeed: 1,
  blessingDensity: 50,
  blessingLineGap: 0.9,
  theme: "sakura"
};

const storageKey = "bloombeat-draft";

export function normalizeRecipientName(value: string) {
  const trimmed = value.trim().slice(0, 15);
  return trimmed || "TA";
}

export function normalizeBlessing(value: string) {
  return value.trim().slice(0, 50);
}

export function getDraft(): GiftDraft {
  if (typeof window === "undefined") {
    return defaultGift;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return defaultGift;
  }

  try {
    return { ...defaultGift, ...JSON.parse(raw) } as GiftDraft;
  } catch {
    return defaultGift;
  }
}

export function saveDraft(nextDraft: Partial<GiftDraft>) {
  if (typeof window === "undefined") {
    return;
  }

  const current = getDraft();
  const merged = { ...current, ...nextDraft };
  const { audioUrl, backgroundImageUrl, ...lightDraft } = merged;
  window.localStorage.setItem(storageKey, JSON.stringify(lightDraft));
}

export function clearDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}
