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
  backgroundPresetId?: string;
  weatherPreset?: "sunny" | "rain" | "night" | "snow" | "wind";
  scenePreset?: string;

  blessingText: string;
  blessingColor: string;
  blessingFontSize: number;
  blessingSpeed: number;
  blessingDensity: 15 | 30 | 50 | 75;
  blessingLineGap: number;
  blessingMarqueeEnabled: boolean;

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

## 阶段 4 摄像头与手势识别

当前阶段 4 已处理摄像头授权、实时预览、模式状态、触摸兜底、MediaPipe HandLandmarker 基础识别、双手融合、捏合换色和摄像头 / 触摸手动切换。摄像头画面不保存，也不上传。

当前实现策略：

- 交互核心在 `src/components/GiftExperience.tsx`。
- 摄像头模式只保存在组件内存状态和 `GestureState.mode` 中，不写入 `GiftDraft`。
- 点击 `点击启动摄像头` 后才调用 `navigator.mediaDevices.getUserMedia`。
- 摄像头请求只请求 video，不请求 audio。
- 先请求前置摄像头，失败后降级请求任意可用摄像头。
- 成功后把 `MediaStream` 保存到组件 ref，并绑定到页面内 `<video>` 预览。
- 组件卸载时停止所有 camera tracks。
- 摄像头失败或用户拒绝权限时，回到 `mode: "touch"`，触摸交互继续可用。
- 当前摄像头手势教学为 4 个板块：
  - `手掌上下摆动` -> 花朵长高变矮。
  - `手掌左右摇晃` -> 花朵左右摇晃。
  - `张开五指并拢双拳` -> 花朵张开闭合。
  - `拇指与食指孔雀形状捏合` -> 颜色切换。

MediaPipe 识别结果继续映射到现有 `GestureState.type`、`plantHeight`、`windPower`、`flowerOpen`、`flowerColorIndex`，避免新增与触摸模式重复的交互状态。

当前 MediaPipe 实现状态：

- 已安装 `@mediapipe/tasks-vision`。
- 使用 `HandLandmarker` 的 VIDEO 模式处理摄像头 `<video>`。
- wasm 运行时路径：`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm`。
- 模型路径：`https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`。
- 映射规则：
  - 掌心 Y 位置 -> `plantHeight`。
  - 掌心横向移动速度 + 手掌左右倾斜 + 指尖相对掌心横向摆动 -> `windPower`。
  - 掌心移动方向 -> `vertical_wave` / `horizontal_wave`。
  - 指尖到掌心的归一化距离 -> `open_hand` / `fist` 和 `flowerOpen`。
  - 拇指指尖和食指指尖距离 / 掌宽进入捏合状态 -> `clap`，触发统一换色。
- 体验稳定性策略：
  - 摄像头启动分两段：先显示摄像头预览，再后台加载 MediaPipe。
  - 预览上用 canvas 为双手绘制同样的整手骨架、手掌轮廓、拇指 / 食指高亮点、掌心主控点和掌心轨迹，帮助用户感知识别状态。
  - 最多识别 2 只手；双手动作方向和高度接近时融合信号，路径差异较大时优先使用右手；没有右手时使用左手；无 handedness 信息时选择离画面中心最近的手。
  - 摄像头横向坐标按用户看到的镜像预览统一，左右手向屏幕同一方向移动时风向信号保持一致。
  - 高度控制改为基于首帧校准的掌心 Y 相对位移，并加入轻量垂直速度辅助，避免进入摄像头时因手在低位直接压低花朵。
  - 风力控制改为掌心横向速度、手掌左右倾斜和指尖横摆的复合信号。
  - 手处于较高或较低位置时，左右控制轻量提高左右倾斜和指尖横摆权重，降低对掌心横向位移的依赖。
  - 开合控制改为整手伸展状态，使用指尖到掌心的归一化距离判断张开 / 收拢。
  - 开合距离计算使用未镜像的真实掌心坐标；左右方向控制使用用户看到的镜像坐标，两者不要混用。
  - 换色控制使用捏合状态机：进入阈值触发换色，释放阈值允许下一次换色，冷却约 580ms。
  - 掌心坐标使用较快平滑插值，降低跳变同时减少延迟。
  - 上下 / 左右移动设置死区，减少微小抖动误触发。
  - 高度和风力设置单帧最大变化限制，避免灵敏度提升后突然跳变。
  - 双手融合需要连续约 2 帧稳定，避免融合和右手优先频繁切换。
  - 短暂丢失手部关键点时保留上一手势约 250ms，减少画面边缘或高低位导致的瞬断。
  - 开合手势需要候选状态稳定约 200ms 后才切换。
  - 开合候选刚变化的短窗口内会降低高度和风力更新幅度，减少张开 / 握拳动作串扰上下 / 左右指令。
  - 摄像头模式和触摸模式可手动切换；切换到触摸模式时停止摄像头 tracks，切回摄像头时重新请求 / 启动识别。
- MediaPipe 或模型加载失败时，不阻断礼物体验，自动保留触摸模式。

## API

```txt
POST /api/music/parse-link
POST /api/music/search
POST /api/gifts
GET  /api/gifts/[id]
POST /api/upload
```

## 阶段 5 前端体验状态

阶段 5 当前没有新增服务端 API 或 Gift 数据字段，主要是前端体验层增强。

新增工具：

```txt
src/lib/clipboard.ts
```

- `copyTextToClipboard(text: string): Promise<boolean>`
- 优先使用 `navigator.clipboard.writeText`。
- 失败时回退到隐藏 textarea + `document.execCommand("copy")`。
- 返回 `true` 表示复制成功，返回 `false` 表示复制失败，调用方负责显示用户提示。

加载状态：

- `/create/preview` 草稿读取前显示 `正在整理礼物预览`。
- `/gift/[id]` 礼物读取前显示 `正在打开这份礼物`。
- 两个加载提示最短可见约 720ms，只影响视觉提示，不改变数据读取、分享生成或礼物渲染流程。

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

如果缺少 `NEXT_PUBLIC_SUPABASE_URL` 或 `SUPABASE_SERVICE_ROLE_KEY`，云端 API 返回 503，前端自动回退到 `/gift/share#bloombeat=...` 自包含链接。

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
  - 图片必须为 `image/*`，最大 8MB。
  - 音频支持 `mp3 / wav / m4a`，最大 10MB。
  - 成功返回：`{ url, path }`
- `POST /api/gifts`
  - 入参：`{ gift: Gift }`
  - 成功返回：`{ id, gift }`
  - 数据保存到 Supabase `gifts` 表的 `gift` jsonb 字段。
  - 同一 `id` 再次保存时使用 upsert，避免重复生成时主键冲突。
- `GET /api/gifts/[id]`
  - 成功返回：`{ gift }`
  - 未找到返回 404。
  - 未配置 Supabase 返回 503。
