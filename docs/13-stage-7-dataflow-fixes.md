# BloomBeat 阶段 7：制作流程数据流 / UI 阻塞修复现场文档

> 更新时间：2026-06-25 20:10  
> 目的：新会话第一件事读这份文件，立刻进入"用户现场"，理解"我之前做了什么、问题到底在哪、下次该注意什么"。

---

## 0. 用户原话与现象（最重要先看这一段）

### 用户最近两轮的真实反馈

**第 1 轮**：上传后无法生成预览，点击"礼物效果"卡在整理页。

**第 2 轮（最关键）**：
> 选歌页本地上传音频**无法真实选中歌曲**；系统BGM**点击也不会选中**。  
> 下一步点击上传图片页**无法真实选中图片**，点击其他**主题也选不了**。  
> 点击预览礼物**只会进入正在整理礼物预览页面**，根本**进不去交互页**。

**用户的判断**：**"感觉是整个系统有问题"** —— 这是真的，不是没反应，而是用户看到的状态被其他东西覆盖/吃掉了。

### 用户第 3 轮：要求把代码改动和决策写成上下文文档

> 没问题。将你本轮做的代码改动，当前项目的关键决策，已完成部分、待办事项、重要文件修改记录和整体架构思路，更新到文件夹中的上下文文档里，便于下次新会话直接加载。

**本文件就是为这条指令而写。**

---

## 1. 真实根因（4 层叠加，不是 1 个）

读完 `dev-server.log` + 5 个关键文件源码后，定位到 **4 个独立的物理障碍**同时存在，共同造成用户看到的现象：

| # | 根因 | 物理表现 | 修复 |
|---|------|---------|------|
| 1 | `shouldStartFromGuide()` 用 sessionStorage 判定流程，cloudflared 隧道 / 移动端扫码打开时 sessionStorage 没值 | 用户直接打开 `/create/song` URL → useEffect 跑 `router.replace("/")` → 闪一下回首页 → 用户看到"点完没反应" | `src/lib/creationFlow.ts` 加 localStorage 兜底 + 标记缺失时自动写入 + 永远返回 false（不 redirect） |
| 2 | `GiftExperience` 的 `showGuide` 默认 `true`，guide-overlay 是 z-index:20 + backdrop-filter:blur(10px) 的全屏蒙层 | 用户进 preview / gift 第一眼是"半透明蒙层 + 模糊"，**以为"还在整理页"** | `src/components/GiftExperience.tsx` `useState(true)` → `useState(false)` |
| 3 | preview 页用 `<Link href="/gift/demo?from=preview">` → gift 页用 `useSearchParams()` → Next 16 + React 19 强制 Suspense fallback | 进礼物页瞬间挂起 + 蒙层覆盖 → 用户看到"卡整理页 → 跳礼物页 → 弹回整理页"死循环 | preview 改 `<button onClick={router.push("/gift/demo")}>`；gift 页删 `useSearchParams` + 删 fromPreview 块 |
| 4 | 用户完全看不到数据流走到哪一步，没法判断"点没生效"还是"生效了 UI 没更新" | 调试盲区 | **新增 `src/components/DebugBanner.tsx`**，挂在 layout，1.5s 轮询，实时显示：歌曲名 / 选中状态 / 音频 data URL 大小 / 图片 data URL 大小 / flow flag |

### 数据流 vs UI 阻塞 —— 关键认知

**数据流（localStorage / IndexedDB）从一开始就是同步的、`saveDraft` 也正常写**。  
**真正问题是 UI 蒙层和路由 redirect 把用户的状态更新"吃掉"了**。

之前几轮我一直在调数据流（IndexedDB 异步、window 缓存、三层兜底），方向错了。  
**这次转向"物理障碍"——把所有可能阻塞用户看到真实状态的东西拆掉。**

---

## 2. 本轮 8 个文件修改清单

| 文件 | 改动 | 关键代码 |
|------|------|---------|
| `src/lib/creationFlow.ts` | 双层 flag（session + localStorage），缺失时自动写 | `shouldStartFromGuide()` 永远返回 false；`startCreationFlow()` 同步写 `bloombeat-auto-flow` 到 localStorage |
| `src/lib/gift.ts` | `saveDraft` 同步写完整 draft（带 audioUrl/backgroundImageUrl） | 4MB 超限才回退到精简版（去掉 audioUrl / backgroundImageUrl） |
| `src/components/GiftExperience.tsx` | showGuide 默认 false | `useState(true)` → `useState(false)` |
| `src/app/create/song/page.tsx` | 加 console 日志 | `console.log("[song] chooseSong 点击", song.title)` + `console.log("[song] saveDraft 成功，localStorage 大小：", ...)` |
| `src/app/create/preview/page.tsx` | 礼物效果按钮改 button + onClick + router.push | `function goToGift() { ... router.push("/gift/demo") }`；删 `?from=preview` query；删 useSearchParams 相关 |
| `src/app/gift/[id]/page.tsx` | 删 useSearchParams、删 markReturnToEdit、删 fromPreview 块 | demo 路径 `getDraft()` 同步读 0 延迟 |
| `src/components/DebugBanner.tsx`（**新**） | 顶部固定诊断条 | 1.5s setInterval 轮询 localStorage + sessionStorage |
| `src/app/layout.tsx` | 挂 `<DebugBanner />` | 放在 `<body>` 最前 |
| `src/app/globals.css` | body padding-top 让出诊断条 | `body { padding-top: 30px }` |

### 关键文件当前状态速查

- **`src/lib/creationFlow.ts`**（96 行）—— 已有 `autoFlowKey` 兜底，`shouldStartFromGuide()` 永远返回 `false`。
- **`src/lib/gift.ts`**（240 行）—— `saveDraft` 优先同步写完整 draft，4MB 截断。
- **`src/components/GiftExperience.tsx`** —— `useState(false)` showGuide。
- **`src/app/create/preview/page.tsx`**（160 行）—— 用 `goToGift()` 函数 + `useRouter` 跳礼物页。
- **`src/app/gift/[id]/page.tsx`**（151 行）—— 删了 `useSearchParams` import 和 `fromPreview` 块。
- **`src/app/layout.tsx`** —— 挂 `<DebugBanner />`。

---

## 3. 当前主流程（修完后）

```
用户进入 https://stones-authentication-fridge-speakers.trycloudflare.com
  ↓
/  首页点 "开始制作" → clearDraft() + startCreationFlow()（双层 flag）
  ↓
/create/song  选歌
  useEffect: shouldStartFromGuide() → 永远 false（不弹回）
  useEffect: 同步 getDraft() 立刻拿到 draft
  按钮 onClick: chooseSong() → setState + 同步 saveDraft + console.log
  诊断条 1.5s 轮询: 🎵 歌曲名 / ✓ 选中:是 / 🎶 音频:xx.xKB
  ↓
/create/content  填称呼/祝福/图片/主题
  useEffect: 同步 getDraft()
  图片上传: 同步 saveDraft（带 backgroundImageUrl）
  主题: 同步 saveDraft
  ↓
/create/preview  预览
  useEffect: 同步 getDraft() → setDraft(draft) → setDraftLoaded(true) → 0 loading
  GiftExperience: showGuide=false → 用户直接看到礼物页（不再被蒙层盖住）
  "礼物效果" 按钮: onClick=goToGift() → router.push("/gift/demo")
  ↓
/gift/demo  礼物交互页
  useEffect: 同步 getDraft() → setGift → 0 延迟
  GiftExperience: showGuide=false → 用户直接看到互动
```

**关键变化：0 异步、0 必要的 loading、`/create/preview` 不再卡"整理页"、从 preview 到 gift 不再死循环。**

---

## 4. 关键决策记录（决策原因 / 备选 / 为什么选这个）

### 决策 1：去掉 window 缓存，完全用同步 localStorage

**之前方案**：  
- 选歌页写 localStorage + 写 `window.__bloombeatPreviewDraft` 全局变量  
- 预览页读 window 变量优先，localStorage 兜底  

**用户反馈**：  
> "你这个方案不对吧，我是手机端怎么调用 window 啊"

**用户原意**：手机端浏览器虽然技术上 `window` 可用，但用户认为这是"PC 思路"，**不要把 window 当主数据通道**。

**最终方案**：完全重构为同步 localStorage，**删掉所有 window 缓存代码**。

### 决策 2：去掉 `useSearchParams()`（gift 页）

**之前**：`const fromPreview = searchParams.get("from") === "preview";` → 控制"返回"按钮显示。  
**代价**：Next.js 16 + React 19 强制 Suspense fallback → 客户端挂起 → 蒙层覆盖 → 死循环。  
**决策**：删 `useSearchParams`，删 `fromPreview` 块，删 `markReturnToEdit` 调用。  
**代价**：preview 页点"礼物效果"跳到 gift 页时不再有右上角"返回"按钮 —— 接受。

### 决策 3：showGuide 默认 `false` 而不是 `true`

**之前**：`useState(true)` → 用户进礼物页第一眼是"舞动双手，唤醒这片花园"蒙层。  
**问题**：用户以为"卡在整理页"，因为蒙层 z-index:20 + blur(10px) 覆盖整个 gift-stage 区域。  
**决策**：默认 `false`，guide 改成"可重入小浮层"，需要时点 ? 按钮再呼出。  
**代价**：老用户首次进入会"少一道引导" —— 接受，因为蒙层是"主障碍"。

### 决策 4：shouldStartFromGuide 永远返回 false

**之前**：`!hasSessionFlag(flowKey)` → 没 flag 就 `router.replace("/")` → 用户从 cloudflared 隧道扫码进来会被弹回首頁。  
**新方案**：检测不到 flag 时，**自动写入** + 同步回填 sessionStorage，**永远不 redirect**。  
**代价**：直接打开 `/create/song` URL（不经过首页）会"绕过"首页清空草稿的逻辑 —— 接受。

### 决策 5：保留 DebugBanner

**作用**：用户能直观看到 "🎵 歌曲：晨光花园 / ✓ 选中：是 / 🎶 音频：xx.xKB / 🚦 flow：1"。  
**代价**：页面顶部 30px 被诊断条占据。  
**决策**：保留 —— 这是排查"用户说没反应"最有效的工具。

---

## 5. 关键技术笔记

### 5.1 手机端 / cloudflared 隧道下的 sessionStorage

- sessionStorage 在跨子域、跨协议、被某些移动端浏览器"严格隐私模式"时**可能被清空**。
- localStorage 比 sessionStorage 在 mobile WebView / 内置浏览器中**更稳定**。
- **结论**：用 localStorage 做持久状态，sessionStorage 只做"会话标记"。

### 5.2 Next.js 16 + React 19 + `useSearchParams`

- `useSearchParams()` 在 Next 16 强制 Suspense fallback，**client component 不能无条件调用**。
- 替代方案：用 `usePathname()` + 自己解析 `window.location.search`，或干脆不依赖 query。
- **教训**：client 组件读 URL 参数前先想"是不是一定要靠 `useSearchParams`"。

### 5.3 全屏蒙层吞点击

- `position: absolute; inset: 0; z-index: 20; backdrop-filter: blur(10px)` 是"覆盖整个区域"的常见手法。
- 如果默认显示 + 没有关闭按钮或关闭条件不明确 → **用户看到的就是"卡住了"**。
- **教训**：默认状态要"露出内容"，蒙层/弹层要"用户主动呼出"。

### 5.4 localStorage 容量限制

- iOS Safari 严格上限 5MB，Android Chrome 严格上限 10MB。
- Data URL 音频/图片 base64 后**比原文件大 33%**。
- 1 分钟 mp3 ≈ 1MB；15MB 限制对应 base64 ≈ 20MB localStorage 写入。
- **本项目处理**：4MB 阈值，超过则截断掉 audioUrl/backgroundImageUrl，保留其他字段。

### 5.5 同步 vs 异步数据流

- **同步 localStorage** = 0 延迟、0 异常点、0 loading 状态、调试简单。
- **异步 IndexedDB** = 大文件支持、但不写不入 + useEffect 才能读 → 至少一帧 loading。
- **window 缓存** = PC 可用、但用户觉得"PC 思路"、不推荐。
- **决策**：本项目用同步 localStorage 为主，IndexedDB 作为大资源兜底（仍在 `localGiftStore.ts` 保留）。

### 5.6 dev server 调试技巧

- `dev-server.log` 路径：`C:\Users\张喆勤\BloomBeat\dev-server.log`
- 找访问模式：`tail -200 dev-server.log | grep -E "create|song|content|preview|gift"`
- 找错误：`grep -E "404|500|error|Error" dev-server.log`
- 找进程：`netstat -ano | grep ":3000"`（但有时 awk 提取 PID 失败）
- **干净重启**：
  ```powershell
  taskkill -F -IM "node.exe"
  cd C:\Users\张喆勤\BloomBeat
  rm -rf .next
  npm.cmd run dev -- --hostname 0.0.0.0 --port 3000
  ```

### 5.7 cloudflared 隧道

- 启动：`cloudflared.exe tunnel --url http://localhost:3000`（后台）
- 当前 URL：`https://stones-authentication-fridge-speakers.trycloudflare.com`
- 验证：`curl -s -o /dev/null -w "%{http_code}" https://stones-authentication-fridge-speakers.trycloudflare.com/`

---

## 6. 验证记录

### 6.1 本轮修复后的验证

- `npm run build` ✓ 通过
- 5 个核心路由 HTTP 200：
  - `/` → 200
  - `/create/song` → 200
  - `/create/content` → 200
  - `/create/preview` → 200
  - `/gift/demo` → 200
- cloudflared 隧道：`https://stones-authentication-fridge-speakers.trycloudflare.com` → 200
- HTML 抓取确认 `DebugBanner` chunk 已加载到 layout

### 6.2 还需要用户在手机端验证（重要）

用户在手机端按 4 步流程验证（选歌→内容→预览→礼物），**重点看诊断条的变化**：

1. 打开 `https://stones-authentication-fridge-speakers.trycloudflare.com/create/song`
2. 看诊断条初始状态：🎵 歌曲：未选 / ✓ 选中：否 / 🎶 音频：无 / 🚦 flow：无
3. 点"晨光花园" → 诊断条应立刻变成：🎵 歌曲：晨光花园 / ✓ 选中：**是** / 🚦 flow：**1**
4. 点"上传本地音频" 选一个 mp3 → 诊断条：🎶 音频：**xx.xKB**
5. 点"下一步" → /create/content → 上传图片 → 诊断条：🖼 图片：**xx.xKB**
6. 点"预览" → /create/preview → **直接看到礼物页**（不再卡"整理页"）
7. 点"礼物效果" → /gift/demo → **直接看到互动页**（不再死循环）

**如果诊断条有变化但页面没反应** → React state 没刷新问题  
**如果诊断条没变化** → 按钮 onClick 没绑上 / localStorage 写不进 → 需要截图 + console 日志

---

## 7. 待办事项

### 7.1 本轮修复未完成部分（用户报告"还是失败"）

**用户反馈**：上一轮修完后用户**依然报告"还是失败"**——具体 3 个症状（选歌/图片/主题选不中、点预览只进整理页）原样未解。  
**本轮修复是去掉了"4 个真实物理障碍"**，但用户**还没验证新版本**。  
**下一次会话第一件事**：问用户"在手机端测试了吗？诊断条有变化吗？"，如果还是失败，需要：
- 抓浏览器 Console 截图（看 `console.log("[song] chooseSong 点击", song.title)` 有没有打）
- 抓 localStorage 实际内容（DevTools → Application → Local Storage）
- 检查手机端浏览器是否禁用了 localStorage / sessionStorage

### 7.2 阶段 7 后面的优先级

1. **Vercel 永久部署替代临时 cloudflared** —— cloudflared URL 每次启动会变
2. **阶段 2 后续：配置 Supabase** —— 完成跨设备分享
3. **阶段 3：接真实音乐 API**（QQ 音乐 / 酷狗）
4. **阶段 4：HTTPS 真机摄像头手势调参**
5. **阶段 5：UI 细节持续打磨**

### 7.3 已知的遗留限制

- 真实 QQ 音乐 / 酷狗 API 未接入
- mock 推荐没有真实播放地址
- Supabase 凭证未配置
- 本地 IndexedDB 存储以 Data URL 存，不适合作为长期线上存储
- MediaPipe 手势识别阈值仍为启发式，需要真机调参

---

## 8. 文件结构速查

```
C:\Users\张喆勤\BloomBeat\
├── docs\
│   ├── 00-project-overview.md
│   ├── 01-prd.md
│   ├── 02-user-flow.md
│   ├── 03-tech-spec.md
│   ├── 04-design-system.md
│   ├── 05-interaction-and-gesture-spec.md
│   ├── 06-api-and-data-spec.md
│   ├── 07-development-roadmap.md
│   ├── 08-acceptance-checklist.md
│   ├── 09-risk-and-fallback.md
│   ├── 10-coding-agent-rules.md
│   ├── 11-session-handoff.md   ← 阶段 5 之前的总交接
│   ├── 12-gesture-tuning.md
│   ├── 12-vibe-coding-continuation-prompt.md
│   └── 13-stage-7-dataflow-fixes.md   ← 本文件（本轮修复的现场文档）
├── dev-logs\
│   ├── 2026-06-23.md
│   ├── 2026-06-24.md
│   ├── 2026-06-25.md   ← 本轮日志
├── src\
│   ├── app\
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── create\
│   │   │   ├── page.tsx   ← /create 重定向到 /
│   │   │   ├── song\page.tsx
│   │   │   ├── content\page.tsx
│   │   │   └── preview\page.tsx
│   │   ├── gift\[id]\page.tsx
│   │   └── api\
│   │       ├── gifts\route.ts
│   │       ├── music\parse-link\route.ts
│   │       ├── music\search\route.ts
│   │       └── upload\route.ts
│   ├── components\
│   │   ├── AppHeader.tsx
│   │   ├── DebugBanner.tsx   ← 本轮新增
│   │   ├── GestureDebugPanel.tsx
│   │   ├── GiftBackground.tsx
│   │   ├── GiftExperience.tsx   ← 本轮修改（showGuide 默认 false）
│   │   └── SynthBgmButton.tsx
│   └── lib\
│       ├── clipboard.ts
│       ├── cloudGiftStore.ts
│       ├── creationFlow.ts   ← 本轮修改（双层 flag + 不再 redirect）
│       ├── gestureConfig.ts
│       ├── gift.ts   ← 本轮修改（saveDraft 同步写完整 draft）
│       ├── localGiftStore.ts
│       ├── mockMusic.ts
│       └── supabaseAdmin.ts
├── public\
│   └── theme-backgrounds\
│       ├── sakura.jpg
│       ├── morning.jpg
│       ├── cream.jpg
│       └── blue.jpg
├── next.config.ts
├── package.json
├── dev-server.log   ← dev server 实时日志
├── cloudflared.exe
└── README.md
```

---

## 9. 新会话启动建议（精简版）

新会话或新 coding 工具接手时，按这个顺序读：

```txt
1. docs/13-stage-7-dataflow-fixes.md   ← 本文件，最重要
2. docs/11-session-handoff.md   ← 阶段 5 之前的总交接
3. docs/00-project-overview.md
4. docs/10-coding-agent-rules.md
5. dev-logs/2026-06-25.md
```

推荐启动命令：

```powershell
cd C:\Users\张喆勤\BloomBeat
npm.cmd install
npm.cmd run dev -- --hostname 0.0.0.0 --port 3000
```

如果需要外部访问（手机扫码）：

```powershell
cd C:\Users\张喆勤\BloomBeat
.\cloudflared.exe tunnel --url http://localhost:3000
```

常用验证命令：

```powershell
npm.cmd run build
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/create/song
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/create/preview
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/gift/demo
```

**第一件事**：问用户"在手机端测试了吗？诊断条有变化吗？"，定位本轮修复是否生效。
