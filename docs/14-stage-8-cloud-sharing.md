# 阶段 8：云端真实分享配置与验收

## 目标

阶段 8 的目标是让 BloomBeat 礼物可以真实转发给别人：

- 上传背景图保存到 Supabase Storage。
- 上传音频保存到 Supabase Storage。
- 礼物数据保存到 Supabase Database。
- 分享成功时生成稳定的 `/gift/[id]` 链接。
- 云端未配置或保存失败时，保留 `/gift/share#bloombeat=...` 自包含兜底链接。

## 环境变量

复制 `.env.example` 为 `.env.local`，填入：

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=bloombeat-gifts
```

`SUPABASE_SERVICE_ROLE_KEY` 只能用于服务端 API，不能暴露到客户端。

## Supabase Database

在 Supabase SQL Editor 中执行：

```sql
create table if not exists gifts (
  id text primary key,
  gift jsonb not null,
  created_at timestamptz default now()
);
```

当前服务端使用 service role 写入和读取；如果后续开放客户端读取，再补 RLS 策略。

## Supabase Storage

创建公开 bucket：

```txt
bloombeat-gifts
```

目录约定：

```txt
image/
audio/
```

上传限制：

- 图片：`image/*`，最大 8MB。
- 音频：mp3 / wav / m4a，最大 10MB。

## 数据兼容

`GiftDraft` 保留当前字段，并预留未来视觉和资源扩展字段：

```ts
backgroundPresetId?: string;
weatherPreset?: "sunny" | "rain" | "night" | "snow" | "wind";
scenePreset?: string;
```

阶段 8 不暴露天气 UI，只保证云端存储和分享 hash 能兼容这些字段。

## 验收流程

1. 启动本地服务或部署到 Vercel。
2. 使用 A 浏览器制作礼物，上传背景图和音频。
3. 在 `/create/preview` 点击 `完成并分享`。
4. 如果 Supabase 配置正确，应生成 `/gift/[id]` 链接。
5. 使用 B 浏览器或手机打开链接。
6. 验证礼物名称、祝福、主题、弹幕开关、背景图和音乐一致。
7. 临时移除 Supabase 环境变量后再生成一次，确认会降级为 `/gift/share#bloombeat=...` 并显示限制提示。

## 已知边界

- 自包含 hash 链接不会携带上传音频或 data URL 图片。
- 摄像头手势仍需要 HTTPS / localhost secure context。
- 系统 BGM、默认背景和天气切换后续可调整，但不应破坏已分享礼物。

# Stage 8 Current Handoff

For the latest Stage 8 decisions, implementation status, validation notes, and next-step plan, read `docs/15-stage-8-handoff.md`.

---
