export type ThemeKey = "sakura" | "morning" | "cream" | "blue";

export type GiftDraft = {
  id?: string;
  recipientName: string;
  title: string;
  songSourceType: "upload" | "default" | "link" | "recommendation";
  musicSelected?: boolean;
  songTitle: string;
  artist: string;
  bgmPresetId?: string;
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
    backgroundImage: string;
    backgroundPositionX: number;
    backgroundPositionY: number;
    backgroundScale: number;
    text: string;
    flower: string[];
    accent: string;
    deep: string;
    grass: string;
    leaf: string;
    glow: string;
    box: string;
    boxTop: string;
    note: string;
    heart: string;
  }
> = {
  sakura: {
    name: "樱花粉",
    scene: "温柔、生日、表白",
    wash: "rgba(255, 238, 246, 0.66)",
    mask: "rgba(248, 201, 216, 0.3)",
    gradient: "linear-gradient(160deg, #ffe7ef, #fff7fb 48%, #f8d7e1)",
    backgroundImage: "/theme-backgrounds/sakura.jpg",
    backgroundPositionX: 50,
    backgroundPositionY: 50,
    backgroundScale: 100,
    text: "#c7608a",
    flower: ["#f28caf", "#f7bfd2", "#df7fa5", "#f3a7bd"],
    accent: "#db7d9f",
    deep: "#9f4b6f",
    grass: "#7fbf8c",
    leaf: "#98d1a5",
    glow: "rgba(255, 232, 244, 0.44)",
    box: "linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 221, 230, 0.95))",
    boxTop: "rgba(255, 246, 250, 0.9)",
    note: "#c7608a",
    heart: "#ffe7a8"
  },
  morning: {
    name: "晨光绿",
    scene: "治愈、陪伴、鼓励",
    wash: "rgba(237, 255, 242, 0.66)",
    mask: "rgba(205, 235, 214, 0.3)",
    gradient: "linear-gradient(160deg, #e6f7d8, #fbfff7 48%, #cdebd6)",
    backgroundImage: "/theme-backgrounds/morning.jpg",
    backgroundPositionX: 50,
    backgroundPositionY: 50,
    backgroundScale: 100,
    text: "#5f9d6d",
    flower: ["#8dd49c", "#bddf9c", "#72bd90", "#a7dcb4"],
    accent: "#5ba879",
    deep: "#3f7f56",
    grass: "#6eaf72",
    leaf: "#a6d88f",
    glow: "rgba(215, 244, 190, 0.44)",
    box: "linear-gradient(180deg, rgba(253, 255, 245, 0.95), rgba(218, 241, 204, 0.94))",
    boxTop: "rgba(247, 255, 232, 0.9)",
    note: "#5f9d6d",
    heart: "#fff2a8"
  },
  cream: {
    name: "奶油黄",
    scene: "温暖、感谢、节日",
    wash: "rgba(255, 249, 223, 0.7)",
    mask: "rgba(247, 230, 182, 0.3)",
    gradient: "linear-gradient(160deg, #fff0ba, #fffaf0 50%, #f8df9d)",
    backgroundImage: "/theme-backgrounds/cream.jpg",
    backgroundPositionX: 50,
    backgroundPositionY: 50,
    backgroundScale: 100,
    text: "#c99542",
    flower: ["#f5c95f", "#ffe18a", "#efb95d", "#f8d27b"],
    accent: "#d89a3d",
    deep: "#9b6d2f",
    grass: "#97b85c",
    leaf: "#bdd57d",
    glow: "rgba(255, 231, 155, 0.48)",
    box: "linear-gradient(180deg, rgba(255, 252, 237, 0.96), rgba(248, 224, 157, 0.94))",
    boxTop: "rgba(255, 249, 218, 0.92)",
    note: "#c99542",
    heart: "#fff0a4"
  },
  blue: {
    name: "淡雅蓝",
    scene: "安静、晚安、思念",
    wash: "rgba(237, 246, 255, 0.7)",
    mask: "rgba(205, 223, 248, 0.3)",
    gradient: "linear-gradient(160deg, #e3efff, #fbfdff 50%, #cddff8)",
    backgroundImage: "/theme-backgrounds/blue.jpg",
    backgroundPositionX: 50,
    backgroundPositionY: 50,
    backgroundScale: 100,
    text: "#6b8fc7",
    flower: ["#8fb5eb", "#b5cdf5", "#779cd8", "#a7c4ef"],
    accent: "#6b8fc7",
    deep: "#4e6fa9",
    grass: "#6fa3a1",
    leaf: "#9bcac8",
    glow: "rgba(213, 231, 255, 0.5)",
    box: "linear-gradient(180deg, rgba(250, 253, 255, 0.96), rgba(218, 232, 250, 0.94))",
    boxTop: "rgba(241, 247, 255, 0.92)",
    note: "#5f82bd",
    heart: "#d9ecff"
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
  backgroundPositionY: 50,
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
const maxLocalStorageBytes = 4 * 1024 * 1024; // 4MB 安全线，避开 5MB 严格上限

type WindowWithDraft = Window & { __bloombeatPreviewDraft?: GiftDraft | null };

/**
 * 将完整 draft（含上传的 audioUrl / backgroundImageUrl）存到 window 全局缓存，
 * 使同一 browser session 内的页面（preview → gift/demo）能读到完整数据。
 */
function setPreviewCache(draft: GiftDraft) {
  if (typeof window === "undefined") return;
  (window as WindowWithDraft).__bloombeatPreviewDraft = draft;
}

/**
 * 从 window 全局缓存读取完整 draft。
 */
function getPreviewCache(): GiftDraft | null {
  if (typeof window === "undefined") return null;
  return (window as WindowWithDraft).__bloombeatPreviewDraft ?? null;
}

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

  let fromStorage = defaultGift;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      fromStorage = { ...defaultGift, ...JSON.parse(raw) } as GiftDraft;
    }
  } catch {
    // Ignore parse errors
  }

  // 尝试从 window 缓存恢复 audioUrl / backgroundImageUrl
  // （这两个字段可能因超过 localStorage 4MB 限制而被静默截断）
  try {
    const cached = getPreviewCache();
    if (cached) {
      // 只恢复缓存里有但 localStorage 里没有的大字段
      if (cached.audioUrl && !fromStorage.audioUrl) {
        fromStorage.audioUrl = cached.audioUrl;
      }
      if (cached.backgroundImageUrl && !fromStorage.backgroundImageUrl) {
        fromStorage.backgroundImageUrl = cached.backgroundImageUrl;
      }
    }
  } catch {
    // 缓存读取失败不影响主流程
  }

  return fromStorage;
}

export function saveDraft(nextDraft: Partial<GiftDraft>) {
  if (typeof window === "undefined") {
    return;
  }

  const current = getDraft();
  const merged = { ...current, ...nextDraft };

  // 同步写入 window 全局缓存（含完整 audioUrl / backgroundImageUrl），
  // 保证同一 browser session 内 preview → gift/demo 能读到完整数据。
  setPreviewCache(merged);

  // 同步写入完整 draft（含 audioUrl / backgroundImageUrl），保证预览页能立刻读到上传资源
  try {
    const serialized = JSON.stringify(merged);
    if (serialized.length <= maxLocalStorageBytes) {
      window.localStorage.setItem(storageKey, serialized);
      return;
    }
  } catch {
    // localStorage 写入异常（quota 满），继续走下面的截断版本
  }

  // 超大（>4MB），通常是音频太长 / 图片太大；截断音频和图片但保留其他字段
  // 关键：如果是因为上传音频导致的超大，同时清除 bgmPresetId，
  // 避免系统 BGM 错误接替本该播放的上传音频。
  const { audioUrl, backgroundImageUrl, ...lightDraft } = merged;
  if (merged.songSourceType === "upload" && merged.audioUrl) {
    (lightDraft as Record<string, unknown>).bgmPresetId = undefined;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(lightDraft));
  } catch {
    // Some mobile in-app browsers restrict localStorage; in-memory state in the page itself still works.
  }
}

export function clearDraft() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore restricted storage during reset.
  }
}
