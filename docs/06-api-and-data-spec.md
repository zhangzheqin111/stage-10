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

  theme: "sakura" | "morning" | "cream" | "blue";
  createdAt?: string;
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

## 阶段 2 Supabase 云端分享

### 环境变量

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=bloombeat-gifts
```

如果缺少 `NEXT_PUBLIC_SUPABASE_URL` 或 `SUPABASE_SERVICE_ROLE_KEY`，云端 API 返回 503，前端自动回退到 IndexedDB 本地分享。

### Supabase Database

建议表结构：

```sql
create table gifts (
  id text primary key,
  gift jsonb not null,
  created_at timestamptz default now()
);
```

### Supabase Storage

- bucket 默认：`bloombeat-gifts`
- 图片目录：`image/`
- 音频目录：`audio/`
- 上传后使用 public URL 写入 Gift。

### API 行为

- `POST /api/upload`
  - 入参：`{ dataUrl: string, kind: "image" | "audio" }`
  - 图片必须为 `image/*`，最大 5MB。
  - 音频支持 `mp3 / wav / m4a`，最大 15MB。
  - 成功返回：`{ url, path }`
- `POST /api/gifts`
  - 入参：`{ gift: Gift }`
  - 成功返回：`{ id, gift }`
  - 数据保存到 Supabase `gifts` 表的 `gift` jsonb 字段。
- `GET /api/gifts/[id]`
  - 成功返回：`{ gift }`
  - 未找到返回 404。
  - 未配置 Supabase 返回 503。
