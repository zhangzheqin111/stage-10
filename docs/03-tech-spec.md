# 技术方案

## 推荐技术栈

- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- MediaPipe Hands
- Supabase Database
- Supabase Storage
- Vercel

## 路由

```txt
/
/create/song
/create/content
/create/preview
/gift/[id]
```

## 开发策略

- 阶段 1 只做静态 MVP。
- 阶段 2 接入 Supabase 与分享链接。
- 阶段 3 接入音乐接口与 mock 兜底。
- 阶段 4 接入摄像头手势。
- 阶段 5 做体验打磨。

## 阶段 2 存储说明

- 如果未配置 Supabase，使用浏览器 IndexedDB 作为本地兜底，可在同一设备和同一浏览器中验收 `/gift/[id]`。
- 真实跨设备分享需要配置 `.env.local`，字段参考 `.env.example`。
- Supabase 接入后，图片和音频应上传到 Storage，Gift 配置保存到 Database。
