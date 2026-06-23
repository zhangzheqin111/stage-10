# API 与数据结构

## Gift

```ts
type Gift = {
  id: string;
  recipientName: string;
  title: string;

  songSourceType: "qq_music" | "kugou" | "upload" | "default" | "mock";
  sourceUrl?: string;
  songTitle: string;
  artist?: string;
  coverUrl?: string;
  audioUrl: string;

  backgroundImageUrl: string;

  blessingText: string;
  blessingColor: string;
  blessingFontSize: number;
  blessingSpeed: number;

  theme: "sakura" | "morning" | "cream" | "blue";
  createdAt: string;
};
```

## GestureState

```ts
type GestureState = {
  mode: "camera" | "touch";
  type: "none" | "vertical_wave" | "horizontal_wave" | "open_hand" | "fist" | "clap";
  windPower: number;
  plantHeight: number;
  volume: number;
  flowerOpen: boolean;
  flowerColorIndex: number;
};
```

## API

```txt
POST /api/music/parse-link
POST /api/music/search
POST /api/gifts
GET  /api/gifts/[id]
POST /api/upload
```
