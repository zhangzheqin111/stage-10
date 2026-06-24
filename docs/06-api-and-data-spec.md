# API 与数据结构

## Gift

```ts
type Gift = {
  id: string;
  recipientName: string;
  title: string;

  songSourceType: "upload" | "default" | "link" | "recommendation";
  musicSelected?: boolean;
  sourceUrl?: string;
  songTitle: string;
  artist: string;
  coverUrl?: string;
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

## 阶段 3 音乐 API 技术路线

当前阶段先使用本地 mock 音乐能力，不直接依赖真实 QQ 音乐 / 酷狗 API。选歌页已经固定为四种互斥方式：链接识别、歌曲推荐、上传本地音频、系统 BGM。后续接入真实服务时，建议保持以下适配层形状：

```ts
type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  platform: "QQ 音乐" | "酷狗音乐" | "系统 BGM" | "用户上传";
  coverUrl?: string;
  audioUrl?: string;
  sourceUrl?: string;
};

type ParseMusicLinkResult =
  | { ok: true; track: MusicTrack }
  | { ok: false; message: string; fallback: "search" | "upload" | "default" };
```

后续实现建议：

- `POST /api/music/parse-link`：服务端识别 QQ 音乐 / 酷狗链接，返回歌曲元数据；失败时返回可展示的失败原因和兜底方向。
- `POST /api/music/search`：根据歌手、场景或关键词返回最多 3 首推荐曲目；真实 API 不可用时返回内置推荐。
- 播放地址不是强依赖字段；如果真实 API 无法稳定提供可播放音频，礼物页继续使用系统 BGM 或用户上传音频兜底。
- 如果用户自有 API 能提供 mp3、专辑、封面、歌曲信息，可优先接入该 API，并映射到 `MusicTrack`，不重写选歌页面。
- 系统 BGM 编辑建议先落在本地合成参数上，例如音色、速度、音高组合、情绪 preset；确认体验稳定后再考虑保存为 Gift 字段。
- 所有音乐来源保持排他选择，最终 Gift 只保存用户最后明确选中的一首背景音乐。

当前实现状态：

- 已新增 `POST /api/music/parse-link`，内部调用 `parseMockMusicLink`，成功时返回 mock track，失败时返回明确提示和 `fallback: "search"`。
- 已新增 `POST /api/music/search`，内部调用 `searchMockMusic`，最多返回 3 首内置推荐，并保留系统 BGM 兜底提示。
- 选歌页优先调用上述 API；接口不可用时自动回退到本地 mock 函数，避免破坏四方式选歌主流程。

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
