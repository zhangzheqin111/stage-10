export type MusicPlatform = "QQ 音乐" | "酷狗音乐";

export type MockMusicTrack = {
  id: string;
  title: string;
  artist: string;
  platform: MusicPlatform;
  mood: string;
  coverGradient: string;
  notes: number[];
};

export const mockMusicTracks: MockMusicTrack[] = [
  {
    id: "qq-garden-letter",
    title: "风里的花信",
    artist: "BloomBeat Mock",
    platform: "QQ 音乐",
    mood: "生日、陪伴、温柔",
    coverGradient: "linear-gradient(135deg, #ffd8e6, #f8f3ff 52%, #bdddf8)",
    notes: [261.63, 329.63, 392]
  },
  {
    id: "kugou-night-bloom",
    title: "夜色开花",
    artist: "BloomBeat Mock",
    platform: "酷狗音乐",
    mood: "晚安、思念、安静",
    coverGradient: "linear-gradient(135deg, #dfeaff, #fff7df 54%, #cfe8dc)",
    notes: [220, 293.66, 349.23]
  },
  {
    id: "qq-sunny-hug",
    title: "晴天拥抱",
    artist: "BloomBeat Mock",
    platform: "QQ 音乐",
    mood: "鼓励、感谢、明亮",
    coverGradient: "linear-gradient(135deg, #fff0ba, #fffaf0 48%, #cdebd6)",
    notes: [329.63, 392, 523.25]
  },
  {
    id: "kugou-soft-rain",
    title: "小雨慢慢",
    artist: "BloomBeat Mock",
    platform: "酷狗音乐",
    mood: "治愈、放松、礼物感",
    coverGradient: "linear-gradient(135deg, #d7f4e1, #fff8fb 50%, #f8c9d8)",
    notes: [246.94, 329.63, 440]
  }
];

export function detectMusicPlatform(value: string): MusicPlatform | null {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized.includes("y.qq.com") || normalized.includes("music.qq.com") || normalized.includes("qq.com")) {
    return "QQ 音乐";
  }

  if (normalized.includes("kugou.com") || normalized.includes("kg.qq.com")) {
    return "酷狗音乐";
  }

  return null;
}

export function parseMockMusicLink(value: string) {
  const platform = detectMusicPlatform(value);
  const normalized = value.trim().toLowerCase();

  if (!platform) {
    return {
      ok: false as const,
      message: "未识别到 QQ 音乐或酷狗链接，可以改用搜索推荐、上传音频或系统 BGM。"
    };
  }

  if (normalized.includes("fail") || normalized.includes("error")) {
    return {
      ok: false as const,
      message: `${platform} 链接暂时解析失败，可以继续选择内置推荐或系统 BGM。`
    };
  }

  const track = mockMusicTracks.find((item) => item.platform === platform) ?? mockMusicTracks[0];

  return {
    ok: true as const,
    track,
    message: `已识别 ${platform} 链接，当前使用 mock 解析结果。`
  };
}

export function searchMockMusic(keyword: string) {
  const normalized = keyword.trim().toLowerCase();

  if (!normalized) {
    return mockMusicTracks;
  }

  return mockMusicTracks.filter((track) =>
    [track.title, track.artist, track.platform, track.mood].some((value) => value.toLowerCase().includes(normalized))
  );
}
