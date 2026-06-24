# BloomBeat（花律）项目交接文档

更新时间：2026-06-24

## 1. 项目定位

BloomBeat（花律）是一个治愈系 2D 互动音乐礼物 H5。

用户可以选择系统 BGM 或上传自己的音频，上传图片、填写祝福语、选择主题后，生成一个可分享的互动礼物页面。收礼人打开礼物链接后，只进入交互礼物页，不进入选歌、传图或编辑流程。

当前项目路径：

```txt
C:\Users\张喆勤\BloomBeat
```

GitHub 仓库：

```txt
https://github.com/zhangzheqin111/BLOOMBEAT.git
```

当前 Git 阶段标签：

```txt
stage-1
stage-2
stage-2-2
```

## 2. 关键产品决策

### 项目命名

- 项目名称：BloomBeat（花律）
- 页面定位：音乐礼物，不是普通编辑器或播放器。
- 视觉方向：治愈、浅淡、温馨、2D 平面画风。

### 阶段推进方式

- 按阶段开发，不一次性做完所有功能。
- 每阶段完成后更新 `dev-logs/YYYY-MM-DD.md`。
- 每阶段完成后按 `docs/08-acceptance-checklist.md` 验收。
- 当前已完成并保存：
  - `stage-1`：静态 MVP + 交互体验
  - `stage-2`：本地创建与分享能力
  - `stage-2-2`：阶段 2 云端化兜底、分享体验和图片 / 祝福编辑修正

### 音乐策略

- 阶段 2 支持：
  - 用户上传音频
  - 若无音频，可选系统 BGM
- 用户上传音频后，只播放用户上传音频，不叠加系统 BGM。
- 系统 BGM 板块文案为：`若无音频，可选系统 BGM`
- 点击系统 BGM 卡片时，需要选择该 BGM 并播放对应试听音色。
- 阶段 3 再接 QQ 音乐 / 酷狗链接解析与搜索推荐。

### 图片背景策略

- 未上传图片前，内容页显示空白 `图片预览栏`，不能出现图片或主题图。
- 每次从引导页重新开始流程会清空旧草稿；每次进入内容页，背景图片预览默认恢复为空白，只有本次上传图片后才显示图片。
- 不上传图片时，交互页使用纯色主题背景。
- 上传图片后，图片成为交互页背景。
- 交互页背景规则：
  - 模糊程度：`0.3px`
  - 蒙版：当前主题色 `30%` 透明度
  - 保留泡泡氛围
- 图片编辑支持：
  - 左右位置
  - 上下位置
  - `比例`
- `比例` 语义：
  - `100%` 表示默认大小。
  - 小于 `100%` 为缩小，大于 `100%` 为放大。
  - 当前范围为 `50% - 220%`。
  - 上下位置始终可调，不再因比例为 `100%` 禁用。
- 内容页图片预览栏与最终礼物背景共用 `GiftBackground` 背景层，尽量保持裁切、缩放、蒙版、泡泡氛围一致。
- 图片预览栏保持 9:16 手机比例，但面积控制为小预览，不占据内容页大半屏。

### 交互页体验策略

- 收礼人页面只展示交互礼物，不展示编辑流程。
- 左下角是喇叭按钮，用于播放 / 静音。
- 右下角是转发按钮，样式与喇叭按钮对称。
- 转发按钮点击后弹出分享小弹窗。
- 分享弹窗只有一个主按钮：
  - 未生成链接时：`生成礼物链接`
  - 已生成链接后：`复制链接`
- 分享弹窗使用面向用户的文案，引导生成、复制、转发心意；不在 UI 中展示 Supabase / IndexedDB 等技术术语。
- `/gift/[id]` 分享出去后仍有右下角转发按钮，可继续复制当前礼物链接；不提供编辑入口。
- 从预览页点击 `礼物效果` 进入 `/gift/[id]?from=preview` 时，右上角显示低干扰 `返回` 按钮，可回到 `/create/preview`。
- 喇叭按钮必须隔离 pointer / click 事件，点击播放或静音时不能触发花朵开合、换色或其他触摸动效。

### 引导页与草稿策略

- 引导首页只保留一个 `开始制作` 按钮。
- 打开或刷新引导首页时清空当前创作草稿。
- 点击 `开始制作` 时再次清空草稿，避免旧图片、旧音频或旧文案被带入新流程。
- `/create` 路由重定向到 `/`，即最开始的引导页；真正制作流程从 `/create/song` 开始。

### 花朵交互策略

- 花从音乐盒上方的草地长出。
- 多朵花组成花园，不是单朵花。
- 花初始色跟随主题。
- 双击后整片花园统一随机变色。
- 单击用于花朵开合，双击用于统一变色；双击不应触发第一次单击的开合。
- 无操作时，花像风铃绳子一样轻柔摆动。
- 风力旁有循环按钮，点击后回到 `微风 0`。

### 音量映射策略

- 上下滑动：
  - 花越高，声音越大。
  - 花越矮，声音越小。
- 左右滑动：
  - 越靠左，声音越小。
  - 越靠右，声音越大。
- 手势引导中必须说明音量变化规则。

### 祝福语策略

- 祝福语限制：50 字以内。
- 字号范围：`5px - 20px`
- 祝福颜色支持用户选择：
  - 常用颜色色块。
  - 原生颜色选择器。
  - `更多颜色` 按钮会打开颜色选择器，不再使用吸管取色，避免操作歧义。
- 祝福语占比：
  - 15%
  - 30%
  - 50%
  - 75%
- 占比从页面顶部开始计算。
- 行距范围：`0.5x - 1.2x`
- 祝福语不是下划线波浪，而是由字符组成波浪线形状并横向流动。
- 每个字可轻微独立跳动，但不能破坏整句波浪线轮廓。

## 3. 已完成内容

### 阶段 1：静态 MVP

已完成：

- Next.js 项目骨架。
- 首页。
- 选歌页。
- 礼物内容页。
- 预览页。
- 示例礼物页 `/gift/demo`。
- 2D 音乐盒 + 多花花园。
- 祝福语流动。
- 手势引导蒙层。
- 左上角数据面板。
- 触摸交互：
  - 上下滑动控制植物高度。
  - 左右滑动控制风力和音量。
  - 单击控制花朵开合。
  - 双击控制整片花园统一变色。
- 喇叭按钮播放 / 静音。

### 阶段 2：创建与分享

已完成：

- 上传音频：
  - 支持 mp3 / wav / m4a。
  - 限制 15MB 以内。
  - 上传音频后使用用户音频作为 BGM。
- 系统 BGM：
  - 文案为 `若无音频，可选系统 BGM`。
  - 点击可试听。
- 上传图片：
  - 限制 5MB 以内。
  - 上传后作为交互页背景。
  - 支持左右位置、上下位置和 `比例` 调整。
  - 支持缩小、默认 100% 和放大。
  - 内容页预览与最终礼物页背景共用背景层，减少预览和最终范围不一致。
- 祝福编辑：
  - 支持字号、速度、占比、行距。
  - 支持祝福颜色选择、常用色块和更多颜色选择器。
- 本地分享：
  - 使用 IndexedDB 保存礼物数据和上传资源。
  - 生成 `/gift/[id]`。
  - 同一设备、同一浏览器可打开同一份礼物。
- 云端分享：
  - 已新增 Supabase API 和服务端 helper。
  - 配置 Supabase 时优先保存到云端。
  - 未配置或云端失败时自动回退到 IndexedDB 本地链接。
- 分享入口：
  - 右下角转发按钮。
  - 小弹窗生成 / 复制链接。
  - 用户可见文案只讲生成、复制和转发心意，不展示技术兜底细节。
- `/gift/[id]`：
  - 优先读取云端 Gift，再回退读取本地 IndexedDB。
  - 只显示交互礼物页和转发能力。
  - 不进入选歌、传图、编辑流程。
- 引导页：
  - 只保留 `开始制作`。
  - 每次进入引导页清空旧草稿，重新开始流程。

## 4. 当前限制与待办

### 当前限制

- 阶段 2 已有 Supabase 接口代码，但当前环境未提供 Supabase 凭证，因此真实跨设备云端分享尚未完成连通验收。
- 未配置 Supabase 时使用 IndexedDB 本地兜底；同一设备、同一浏览器可验收，跨设备不可用。
- 上传图片和音频在本地兜底模式下以 Data URL 存入 IndexedDB，适合黑客松本机验收。
- 若清空浏览器数据，未云端化保存的本地礼物链接会失效。
- 尚未接入 QQ 音乐 / 酷狗真实 API。
- 尚未接入摄像头手势识别。

### 待办：阶段 2 云端连通验收

需要 Supabase 配置：

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=bloombeat-gifts
```

后续需要：

- 创建 Supabase Storage bucket。
- 创建 Gift 数据表。
- 填入 `.env.local`。
- 验证图片上传到 Supabase Storage。
- 验证音频上传到 Supabase Storage。
- 验证 Gift 配置保存到 Supabase Database。
- 清空 IndexedDB 后验证 `/gift/[id]` 仍能从云端读取，实现跨设备分享。

### 待办：阶段 3 音乐能力

- QQ 音乐 / 酷狗链接识别。
- 歌曲名、歌手、封面解析。
- 播放地址获取。
- 播放失败时进入搜索推荐或系统 BGM。
- mock 解析兜底。

### 待办：阶段 4 摄像头手势

- 接入 MediaPipe Hands。
- 摄像头授权提示。
- 摄像头失败自动进入触摸模式。
- 摄像头画面不保存、不上传。

### 待办：阶段 5 视觉打磨

- 花朵样式精修。
- 全页面 UI 风格统一。
- 移动端细节适配。
- 加载态、失败态、空状态优化。
- 分享反馈优化。

## 5. 重要文件修改记录

### 核心数据与存储

```txt
src/lib/gift.ts
```

保存礼物草稿数据结构、主题配置和默认值。

重要字段：

- `songSourceType`
- `audioUrl`
- `backgroundImageUrl`
- `backgroundPositionX`
- `backgroundPositionY`
- `backgroundScale`
- `blessingDensity`
- `blessingLineGap`
- `blessingColor`
- `createdAt`
- `clearDraft()`

```txt
src/lib/localGiftStore.ts
```

阶段 2 新增。

作用：

- IndexedDB 本地存储礼物。
- 保存上传音频 / 图片等大资源。
- 生成 `giftId`。
- 保存和读取本地礼物链接。
- 保存和读取本地草稿。
- 清空本地草稿 `clearLocalDraft()`。

```txt
src/lib/supabaseAdmin.ts
```

阶段 2-2 新增。

作用：

- 服务端 Supabase admin client。
- 读取 `NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_STORAGE_BUCKET`。
- 未配置时返回云端不可用状态，供 API 触发本地兜底。

```txt
src/lib/cloudGiftStore.ts
```

阶段 2-2 新增。

作用：

- 客户端优先调用云端 API 保存礼物。
- 将 Data URL 图片 / 音频上传到 `/api/upload`。
- 保存 Gift 到 `/api/gifts`。
- 从 `/api/gifts/[id]` 读取云端 Gift。

### API 路由

```txt
src/app/api/upload/route.ts
```

- 上传图片 / 音频到 Supabase Storage。
- 图片限制 5MB，音频限制 15MB。
- 未配置 Supabase 时返回 503，前端走本地兜底。

```txt
src/app/api/gifts/route.ts
```

- 保存 Gift 到 Supabase `gifts` 表。
- 表结构建议：`id text primary key`、`gift jsonb not null`、`created_at timestamptz default now()`。

```txt
src/app/api/gifts/[id]/route.ts
```

- 按 id 读取云端 Gift。
- 未找到返回 404，未配置返回 503。

### 页面

```txt
src/app/create/song/page.tsx
```

选歌页。

已实现：

- 上传本地音频。
- 15MB 限制。
- 系统 BGM 选择。
- 系统 BGM 试听。

```txt
src/app/create/content/page.tsx
```

礼物内容页。

已实现：

- 称呼编辑。
- 祝福语编辑。
- 背景图片上传。
- 空白图片预览栏。
- 图片展示区域调整。
- 图片 `比例` 调整，范围 50% - 220%。
- 上下位置始终可调。
- 主题选择。
- 祝福语字号、颜色、速度、占比、行距。

```txt
src/app/create/preview/page.tsx
```

预览页。

已实现：

- 礼物效果预览。
- 右下角转发按钮。
- 分享弹窗。
- 优先生成云端 `/gift/[id]`，失败时本地兜底。
- 复制链接。
- `礼物效果` 链接会附加 `from=preview`，用于显示返回预览入口。

```txt
src/app/gift/[id]/page.tsx
```

收礼人页面。

已实现：

- `/gift/demo` 读取当前草稿。
- `/gift/[id]` 优先读取云端 Gift，再回退读取 IndexedDB 保存的礼物。
- 只显示交互礼物页和转发能力。
- 从预览页进入时显示右上角低干扰 `返回` 按钮。

```txt
src/app/create/page.tsx
```

阶段 2-2 新增。

- `/create` 重定向到引导首页 `/`，确保重新开始流程。

### 交互组件

```txt
src/components/GiftExperience.tsx
```

核心交互礼物组件。

负责：

- 背景渲染。
- 花园渲染。
- 祝福语流动。
- 触摸交互。
- 风力 / 高度 / 手势状态。
- 音量计算。
- 手势引导蒙层。
- 接收右下角分享按钮插槽 `actionRight`。

```txt
src/components/GiftBackground.tsx
```

阶段 2-2 新增。

负责：

- 统一渲染礼物背景。
- 内容页图片预览和最终礼物页共用同一背景裁切 / 缩放 / 蒙版 / 泡泡氛围逻辑。

```txt
src/components/SynthBgmButton.tsx
```

音乐播放按钮。

负责：

- 有用户上传音频时播放上传音频。
- 无上传音频时播放系统合成 BGM。
- 喇叭按钮播放 / 静音。
- 监听音量变化。

### 样式

```txt
src/app/globals.css
```

全局样式。

重点区域：

- 页面基础布局。
- 礼物交互页。
- 花园 / 花朵 / 草地 / 音符。
- 背景图片和蒙版。
- 祝福语波浪流动。
- 喇叭按钮。
- 转发按钮。
- 图片预览和裁切控件。

### 文档与日志

```txt
docs/08-acceptance-checklist.md
```

阶段验收标准。

```txt
dev-logs/2026-06-24.md
```

阶段 1 和阶段 2 的详细开发日志。

```txt
.env.example
```

Supabase 云端化预留配置。

## 6. 整体架构思路

当前架构是一个移动端优先的 Next.js H5 项目。

### 路由结构

```txt
/
/create
/create/song
/create/content
/create/preview
/gift/[id]
```

### 数据流

当前阶段：

```txt
引导页清空草稿
  → /create/song 选择音乐
  → /create/content 填写内容 / 上传图片 / 设置颜色
  → GiftDraft
  → IndexedDB 草稿
  → 预览页读取草稿
  → 生成 giftId
  → 优先 Supabase 保存 Gift
  → Supabase 不可用时 IndexedDB 保存 Gift
  → /gift/[id] 优先云端读取，再本地兜底
  → GiftExperience 渲染
```

Supabase 云端路径：

```txt
用户输入 / 上传
  → 图片 / 音频上传到 Supabase Storage
  → Gift 配置保存到 Supabase Database
  → /gift/[id] 通过 id 拉取云端 Gift
  → GiftExperience 渲染
```

本地兜底路径：

```txt
用户输入 / 上传
  → Data URL 存入 IndexedDB 草稿
  → 生成本地 giftId
  → IndexedDB 保存 Gift
  → 同一浏览器打开 /gift/[id]
  → GiftExperience 渲染
```

### 组件分工

- 页面负责流程和表单。
- `GiftExperience` 负责礼物体验和交互。
- `GiftBackground` 负责统一背景渲染。
- `SynthBgmButton` 负责音乐播放。
- `localGiftStore` 负责本地阶段 2 存储兜底。
- `cloudGiftStore` 负责客户端云端保存 / 读取调用。
- `supabaseAdmin` 负责服务端 Supabase client。

### 重要设计原则

- 阶段式推进。
- 高风险能力必须有兜底。
- 真实上线能力逐步替换本地兜底。
- 收礼人页面只体验，不编辑。
- 不为了复杂功能破坏已有主流程。

## 7. 新会话启动建议

新会话或新的 coding 工具接手时，请先阅读：

```txt
README.md
docs/00-project-overview.md
docs/01-prd.md
docs/07-development-roadmap.md
docs/08-acceptance-checklist.md
docs/10-coding-agent-rules.md
docs/11-session-handoff.md
dev-logs/2026-06-24.md
```

推荐启动命令：

```powershell
cd C:\Users\张喆勤\BloomBeat
npm.cmd install
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

常用验证命令：

```powershell
npm.cmd run build
```

当前阶段建议：

1. 如果继续阶段 2，优先填入 Supabase 配置并做跨设备真实分享验收。
2. 如果进入阶段 3，开始音乐链接解析和搜索推荐。
3. 在阶段 5 前，不建议大规模重做花朵样式和全站 UI。
