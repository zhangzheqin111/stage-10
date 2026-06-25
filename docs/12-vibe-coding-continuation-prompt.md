# BloomBeat（花律）后续 Vibe Coding 接手指令

请把下面整段内容作为新 coding 会话的开场指令使用。

```txt
你正在继续开发本地项目：
C:\Users\张喆勤\BloomBeat

项目名：BloomBeat（花律）

这是一个治愈系 2D 互动音乐礼物 H5。用户选择音乐、填写称呼和祝福语、上传或选择背景图、配置主题后生成礼物；收礼人打开 `/gift/[id]` 后进入互动礼物页，通过摄像头手势或触摸让音乐盒花园生长、摇摆、开合和换色。

开始前必须先阅读并理解这些文件：
- README.md
- docs/00-project-overview.md
- docs/01-prd.md
- docs/07-development-roadmap.md
- docs/08-acceptance-checklist.md
- docs/10-coding-agent-rules.md
- docs/11-session-handoff.md
- dev-logs/2026-06-24.md
- dev-logs/2026-06-25.md

开发规则：
1. 不要跳过阶段。
2. 每次只开发一个阶段或一个明确模块。
3. 完成后必须按 docs/08-acceptance-checklist.md 验收。
4. 每次完成后必须更新 dev-logs/YYYY-MM-DD.md。
5. 不要破坏已有主流程：选歌 -> 内容编辑 -> 预览 -> 礼物页。
6. 高风险能力必须有兜底：音乐 API 失败走 mock / 系统 BGM；摄像头失败走触摸模式；上传失败要明确提示并允许重试。
7. 不要把本机 IndexedDB 链接伪装成可跨设备分享链接；真实可转发链接必须等云端保存成功后才生成。
8. 摄像头画面只允许本地实时识别，不保存、不上传，不写入 Gift 数据。

当前 GitHub 仓库：
https://github.com/zhangzheqin111/BLOOMBEAT.git

当前保存点：
stage-6

当前已完成概览：
- 阶段 1：静态 MVP、触摸互动、默认 BGM、手势引导、数据面板。
- 阶段 2：本地创建与分享、图片/音频上传、IndexedDB 兜底、Supabase 云端接口预留。
- 阶段 2-2：云端化兜底、分享体验、图片背景预览一致性、祝福颜色、草稿重置等修正。
- 阶段 3：mock 音乐能力、QQ / 酷狗链接形态识别、搜索推荐、四方式互斥选歌、10 秒试听、本地音频回选、音乐 API 适配层；还没有接真实 QQ 音乐 / 酷狗 API。
- 阶段 4：摄像头授权引导、实时预览、摄像头 / 触摸模式、启动失败触摸兜底、前置摄像头失败后降级、MediaPipe HandLandmarker 基础识别、双手融合、开合防抖、捏合换色、摄像头 / 触摸手动切换、摄像头诊断卡。
- 阶段 5：分享复制反馈、加载态、小屏横向溢出修复、移动端存储容错、sessionStorage 容错、手机 AMR 提示、摄像头安全上下文提示、数据面板闪动修复、失败态 / 空状态、四主题视觉区分、主题默认背景图、动画舒缓、花朵和音乐盒细节精修。

当前重要文件：
- src/components/GiftExperience.tsx：互动礼物核心，包含花园、触摸互动、摄像头授权、MediaPipe 手势识别、摄像头诊断、引导层。
- src/components/GiftBackground.tsx：内容页预览和礼物页共用背景，优先级为用户上传图 > 主题默认图 > 主题渐变。
- src/components/SynthBgmButton.tsx：上传音频或合成 BGM 播放按钮。
- src/lib/gift.ts：GiftDraft、主题配置、默认值、localStorage 轻量草稿。
- src/lib/localGiftStore.ts：IndexedDB 草稿 / 礼物 / 大资源存储，带移动端容错。
- src/lib/cloudGiftStore.ts 和 src/lib/supabaseAdmin.ts：Supabase 云端保存 / 读取预留。
- src/lib/creationFlow.ts：创作流程 sessionStorage 标记，已做受限环境容错。
- src/lib/mockMusic.ts：阶段 3 mock 音乐库和链接 / 推荐能力。
- src/app/create/song/page.tsx：选歌页。
- src/app/create/content/page.tsx：内容编辑页。
- src/app/create/preview/page.tsx：预览和生成分享入口。
- src/app/gift/[id]/page.tsx：收礼人礼物页。
- src/app/globals.css：全局 UI、礼物舞台、引导层、摄像头诊断、花朵、音乐盒、移动端布局。

启动开发环境：
cd C:\Users\张喆勤\BloomBeat
npm.cmd install
npm.cmd run dev -- --hostname 0.0.0.0 --port 3000

常用验收地址：
- http://localhost:3000/
- http://localhost:3000/create/song
- http://localhost:3000/create/content
- http://localhost:3000/create/preview
- http://localhost:3000/gift/demo
- 手机局域网地址通常为 http://192.168.2.9:3000/，但局域网 HTTP 不能真实验收摄像头，只能验收触摸兜底和安全来源提示。

每次改完至少运行：
npm.cmd run build

当前最建议继续的任务：
1. 阶段 5：全站 UI 细节统一精修。注意不要改成营销落地页，第一屏仍应是可用体验；手机端不能出现横向滚动、遮挡或文字溢出。
2. 阶段 4：在 HTTPS 本地入口或正式 HTTPS 部署后做真机摄像头手势调参。先看引导层摄像头诊断卡，再验收张开 / 握拳、初始高度基准、上下 / 左右串扰、捏合换色和摄像头 / 触摸切换。
3. 阶段 2：配置 Supabase，完成真实跨设备分享验收。云端保存成功后才生成可复制转发链接。
4. 阶段 3：接真实音乐 API 或扩展系统 BGM 编辑，但不要重写现有选歌页面；保持四方式互斥选择。

重要验收提醒：
- 电脑 localhost 可以验收多数流程和摄像头权限弹窗。
- 手机局域网 HTTP 通常无法唤起摄像头，这是浏览器安全策略，不等于代码底层坏了。
- 真正验收手机摄像头手势，需要 HTTPS 或浏览器认可的安全来源。
- 未配置 Supabase 时，不应生成误导用户跨设备转发的本机链接。
- 主题默认背景图目录是 public/theme-backgrounds/，固定文件名为 sakura.jpg、morning.jpg、cream.jpg、blue.jpg；用户上传图优先级高于主题默认图。

请先检查 git status，尊重已有未提交改动，不要回滚用户或前任 agent 的改动。然后选择一个明确模块继续开发、验证、记录日志。
```
