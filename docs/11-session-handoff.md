# BloomBeat（花律）项目交接文档

更新时间：2026-06-25

## 1. 项目定位

BloomBeat（花律）是一个治愈系 2D 互动音乐礼物 H5。

用户从四种方式里选择一首歌，填写称呼、祝福语，上传或选择背景图，配置主题后生成一份可分享的互动礼物。收礼人打开 `/gift/[id]` 后只进入交互礼物页，不进入选歌、传图或编辑流程。

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
stage-3
stage-4-1stage-4-2
stage-4-3
stage-5
stage-6（当前保存点）
```

## 2. 关键产品决策

### 阶段推进

- 必须按 `docs/07-development-roadmap.md` 顺序推进。
- 每次只开发一个阶段或一个明确模块。
- 每次完成后按 `docs/08-acceptance-checklist.md` 验收。
- 每次完成后更新 `dev-logs/YYYY-MM-DD.md`。
- 不为了复杂功能破坏已有主流程。

### 当前阶段状态

- 阶段 1 已完成：静态 MVP、触摸互动、默认 BGM、手势引导和数据面板。
- 阶段 2 已完成：本地创建与分享、图片/音频上传、IndexedDB 兜底、Supabase 云端接口预留。
- 阶段 2-2 已完成：云端化兜底、分享体验、图片背景预览一致性、祝福颜色、草稿重置等修正。
- 阶段 3 已完成：mock 音乐能力、四方式互斥选歌、试听控制、本地音频回选、音乐 API 适配层；尚未接真实 QQ 音乐 / 酷狗 API。
- 阶段 4 已完成：摄像头授权引导、实时预览、摄像头 / 触摸模式显示、启动失败触摸兜底、摄像头请求降级重试、MediaPipe HandLandmarker 基础识别与花园交互映射、双手同向融合、捏合状态机、摄像头 / 触摸手动切换、手势灵敏度止血修复、摄像头状态与失败提示、摄像头真机验收诊断信息、真机调参基础设施（`src/lib/gestureConfig.ts` 20 个阈值集中管理 + `src/components/GestureDebugPanel.tsx` 实时调参浮标 + 折叠面板 + localStorage 持久化 + 真机诊断卡）。真机手势参数仍需在 HTTPS 来源（Vercel 部署 / cloudflared 内网穿透）下由用户按体感微调并提交默认值。
- 阶段 5 当前已开始并完成多个明确模块：分享链接复制反馈优化、预览页 / 礼物页加载状态补齐与最短 720ms 可见提示、小屏布局与横向溢出修复、手机端本地存储容错、创作流程 `sessionStorage` 受限容错、手机音频入口和摄像头安全上下文提示、失败态 / 空状态、四主题视觉区分强化、主题默认背景图、动画自然度和舒缓感打磨、花朵和音乐盒细节精修、全站 UI 细节统一精修（页面标题统一、输入框焦点态统一、图片上传控件与音乐上传控件统一、首页第一屏品牌花朵与浮动花瓣）。阶段 5 主要模块均已实现，待用户逐项实机确认。

### 音乐策略

- 选歌页标题：`将音乐卡带放进你的礼物盒~`。
- 用户通过四种互斥方式选择背景歌：
  - 方式一：QQ 音乐 / 酷狗链接。
  - 方式二：歌曲推荐。
  - 方式三：上传本地音频。
  - 方式四：系统 BGM。
- 四种方式排他：最终只使用用户最后明确选定的一首背景歌。
- `当前选择` 默认为空，用户明确选择后才展示歌曲。
- QQ / 酷狗链接识别成功后只展示待使用歌曲卡片，必须点击 `使用这首歌` 才写入草稿。
- 歌曲推荐默认不展开，输入关键词后最多展示 3 首相关推荐。
- 选歌页不向用户展示 mock 示例链接或开发兜底术语。
- 系统 BGM / mock 推荐试听时长为 10 秒；开始新试听前必须停止上一段试听。
- 上传本地音频后显示已上传音频卡片，用户试听其他 BGM 后可点击 `使用该音乐` 重新选回上传音频。
- 上传音频当前只支持 mp3 / wav / m4a；手机录音机常见的 AMR 格式暂不支持，选到 AMR 时必须明确提示用户从文件中选择支持格式。
- 真实 QQ 音乐 / 酷狗 API、第三方音乐 API 接入、系统 BGM 编辑是阶段 3 后续技术路线。接入时保留现有四方式 UI 和排他选择逻辑，只替换数据来源。

### 创作入口与草稿策略

- 引导首页 `/` 只保留一个 `开始制作` 按钮。
- `/create` 重定向到 `/`。
- 直接新开 `/create/song`、`/create/content`、`/create/preview` 时，如果不在当前创作流程内，应回到引导页。
- 点击 `开始制作` 会清空旧草稿，避免旧图片、旧音频或旧文案带入新流程。
- 选歌页、内容页、预览页刷新时应保留已上传的音频和图片资源，避免创作者验收或生成礼物前资源丢失。
- 只有从引导首页点击 `开始制作` 才清空旧草稿和旧上传资源，开启一份全新的礼物。
- 从礼物效果页右上角 `返回` 回到预览 / 编辑链路时，保留用户最近一次上传记录。
- `sessionStorage` 只能作为创作流程标记，不能成为阻断主流程的硬依赖；手机内置浏览器、隐私模式或测试环境限制 `sessionStorage` 时，选择音乐、上传图片、选择主题 / 颜色和进入预览仍必须可用。

### 礼物内容策略

- 内容页标题：`花之物语：把心声装进礼物`。
- 内容页说明：`创造你的个性化礼物`。
- 称呼字段：`心里的TA（对方称呼）`。
- 默认称呼为 `TA`，不再使用 `XX`。
- 称呼最多 15 字；空值归一化为 `TA`。
- 祝福语最多 50 字。
- 祝福字号范围：`5px - 20px`。
- 祝福颜色支持常用色块、原生颜色选择器和 `更多颜色` 按钮。
- 祝福占比：15%、30%、50%、75%，从页面顶部开始计算。
- 祝福行距范围：`0.5x - 1.2x`。
- 祝福语是由字符组成的波浪线形状并横向流动，不使用波浪下划线。

### 图片背景策略

- 未上传图片前，内容页显示空白 `图片预览栏`。
- 不上传图片时，交互页使用纯色主题背景。
- 阶段 5 后，不上传图片时会优先使用当前主题的系统默认背景图；用户上传图片后覆盖主题默认图。
- 主题默认图放在 `public/theme-backgrounds/`，文件名固定为 `sakura.jpg`、`morning.jpg`、`cream.jpg`、`blue.jpg`。
- 上传图片后，图片成为交互页背景。
- 图片支持左右位置、上下位置和 `比例` 调整。
- `比例` 范围为 `50% - 220%`，100% 表示默认大小。
- 交互页上传图片背景模糊为 `0.3px`。
- 上传图片背景蒙版为当前主题色 30% 透明度。
- 内容页图片预览和最终礼物页共用 `GiftBackground`。

### 交互页体验策略

- 收礼人页面只展示互动礼物和转发能力，不提供编辑入口。
- 进入交互页先显示手势引导蒙层。
- 引导蒙层不会自动消失，必须点击 `我知道了`。
- 创作者预览页和收礼人礼物页都复用同一套手势引导逻辑。
- 引导层拆成两个部分：
  - 摄像头优先：标题为 `舞动双手，唤醒这片花园`，下方直接显示 `点击启动摄像头`。
  - 触摸兜底：提示 `如果无法唤起摄像头，你可以按照下列方式触摸屏幕，完成交互。`
- 点击 `点击启动摄像头` 后才请求摄像头权限；页面加载、触摸或滑动不应自动唤起摄像头。
- 摄像头启动时按钮显示 `正在启动摄像头...`。
- 摄像头授权成功后，数据面板显示 `模式 摄像头`，引导卡显示实时摄像头预览，关闭引导后舞台右上角保留小预览。
- 摄像头画面仅绑定浏览器本地视频流，不保存、不上传，不写入 Gift 数据。
- 摄像头启动先请求前置摄像头，失败后自动降级请求任意可用摄像头；最终失败则保持 `模式 触摸` 并展示触摸教程。
- 摄像头引导层显示真机验收诊断信息：安全来源、浏览器摄像头能力、权限状态和最近一次错误名，用于判断无法唤起摄像头时是 HTTPS / 权限 / 设备占用 / 浏览器能力问题。
- 摄像头手势引导当前为 4 个板块：
  - `手掌上下摆动`：花朵长高变矮。
  - `手掌左右摇晃`：花朵左右摇晃。
  - `张开五指并拢双拳`：花朵张开闭合。
  - `拇指与食指孔雀形状捏合`：颜色切换。
- 手势说明必须展示音量与风向变化：
  - 上下摆动：越高声音越大，越矮声音越小。
  - 左右摇晃：越靠左声音越小，越靠右声音越大，并改变西风 / 东风。
- 摄像头教程提示用户只伸出一只手，并尽量保持在画面中央。
- 点击 `我知道了` 后才开始尝试播放音乐。
- 若浏览器拦截播放，左下角喇叭按钮作为手动播放兜底。
- 左下角是喇叭按钮；右下角是转发按钮。
- 喇叭按钮和转发按钮必须隔离 pointer / click 事件，不能触发花朵互动。
- 从预览页进入 `/gift/[id]?from=preview` 时，右上角显示低干扰 `返回` 按钮。

### 花朵与触摸交互策略

- 多朵花从音乐盒上方草地长出。
- 单击控制花朵开合。
- 双击整片花园统一随机变色，且不触发第一次单击的开合。
- 上下滑动控制花朵高度，花越高声音越大。
- 左右滑动控制风力和音量，越靠左声音越小，越靠右声音越大。
- 左右滑动时只让花朵随风摇动，草地和 BloomBeat 便签保持稳定。
- 风力面板显示 `微风 0`、`东风 +X` 或 `西风 +X`，旁边有回到微风的循环按钮。

## 3. 已完成内容

### 阶段 1

- Next.js 项目骨架。
- 首页、选歌页、内容页、预览页、礼物页。
- 2D 音乐盒、多花花园、草地和音符。
- 祝福语波浪流动。
- 手势引导蒙层和左上角数据面板。
- 触摸交互：上下高度、左右风力、单击开合、双击换色。
- 喇叭按钮播放 / 静音。

### 阶段 2

- 上传音频，支持 mp3 / wav / m4a，限制 15MB。
- 上传图片，限制 5MB。
- 上传音频作为 BGM，不叠加系统 BGM。
- 背景图片位置和比例调整。
- 祝福字号、速度、占比、行距、颜色设置。
- IndexedDB 保存草稿、礼物和大资源。
- 生成 `/gift/[id]`，同设备同浏览器可打开。
- 预留 Supabase Storage / Database 云端分享 API。
- 云端未配置或失败时自动回退本地 IndexedDB。
- 右下角分享按钮和生成 / 复制链接弹窗。
- `/gift/[id]` 只进入交互礼物页。

### 阶段 3 当前已完成

- 新增本地 mock 音乐库 `src/lib/mockMusic.ts`。
- QQ 音乐 / 酷狗链接形态识别。
- mock 解析成功展示歌曲名、歌手、平台和封面色块。
- 链接解析失败时提供用户可理解提示，并保留歌曲推荐、上传音频、系统 BGM 兜底。
- 歌曲推荐支持按歌名、歌手、平台、场景关键词筛选。
- 选歌页四方式互斥交互。
- 当前选择卡片默认空白，选择后随用户选择变化。
- 本地音频上传后可在方式三重新选回。
- 所有选歌试听统一 10 秒，且新试听会停止旧试听。
- 交互页音乐改为点击 `我知道了` 后再启动。
- 选歌页和内容页根据用户批注完成文案调整。
- 阶段 3 技术路线已写入 `docs/07-development-roadmap.md` 和 `docs/06-api-and-data-spec.md`。
- 新增 `POST /api/music/parse-link` 和 `POST /api/music/search`，选歌页优先调用 API，失败时回退本地 mock。

### 阶段 4-1 当前已完成

- 礼物页和创作者预览页都有一致的手势引导。
- 引导页优先鼓励摄像头手势交互，同时保留触摸兜底教程。
- 点击按钮后请求摄像头权限，成功后进入摄像头模式。
- 摄像头实时预览可见，便于用户理解镜头画面。
- 摄像头画面不保存、不上传。
- 摄像头失败自动保持触摸模式。
- 摄像头启动增加前置摄像头失败后的普通摄像头降级重试。
- 左上角数据面板显示当前为 `摄像头` 或 `触摸` 模式。
- 摄像头手势教学按 4 个板块展示，避免易误解文案。

### 阶段 4 MediaPipe 基础识别当前已完成

- 安装 `@mediapipe/tasks-vision`。
- 摄像头模式启动后加载 MediaPipe HandLandmarker。
- 使用摄像头 `<video>` 逐帧识别手部关键点。
- 掌心 Y 位置映射花朵高度。
- 掌心横向速度 + 手掌左右倾斜 + 指尖相对掌心横摆映射风力 / 左右摇晃。
- 指尖到掌心的归一化距离映射花朵张开 / 闭合。
- 拇指与食指捏合距离 / 掌宽进入捏合状态机后映射统一换色。
- 识别结果会更新数据面板的手势状态、高度和风力。
- MediaPipe、模型或摄像头失败时继续保留触摸模式。
- 摄像头启动已优化为两段式：先显示预览，再后台准备 MediaPipe。
- 摄像头预览上用 canvas 绘制整手骨架、手掌轮廓、拇指 / 食指高亮点、掌心主控点和掌心轨迹，帮助用户感知识别状态。
- 多手策略为双手同向融合，路径差异较大时右手优先；没有 handedness 信息时才回退到画面中心最近的手。
- 最多识别 2 只手：两只手都用同样的彩色实线骨架和轨迹显示，方向和高度接近时一起参与控制。
- 掌心坐标做较快平滑插值，上下 / 左右移动有死区，开合状态需稳定约 200ms 才切换，捏合换色保留冷却。
- 最新优化：左右手横向坐标按用户看到的镜像预览统一，左右手向屏幕同一方向移动时风向一致。
- 最新优化：高度控制改为掌心 Y 位置，风力控制改为掌心横向速度、手掌左右倾斜和指尖横摆的复合信号。
- 最新优化：提高上下 / 左右灵敏度但恢复稳定性优先，高度使用首帧校准的掌心 Y 相对位移和轻量垂直速度辅助，避免进入摄像头时手在低位直接压低花朵。
- 最新优化：开合距离计算使用未镜像的真实掌心坐标，左右方向控制使用用户看到的镜像坐标，避免坐标混用导致张开 / 握拳失效。
- 最新优化：左右在高位 / 低位轻量提高倾斜和指尖横摆权重，不再使用过强补偿。
- 最新优化：增加高度 / 风力单帧最大变化限制、约 250ms 丢帧保持，以及双手融合 2 帧缓冲。
- 最新优化：开合候选刚变化时短暂降低高度和风力更新幅度，减少开合动作串扰上下 / 左右指令。
- 最新优化：换色识别改为捏合状态机，进入阈值触发，释放阈值允许下一次触发，冷却约 580ms。
- 最新优化：新增摄像头 / 触摸模式手动切换入口；问号引导根据当前触发形式显示摄像头或触摸规则。

## 4. 当前限制与待办

### 当前限制

- 尚未接入真实 QQ 音乐 / 酷狗 API。
- mock 推荐没有真实播放地址；礼物页仍使用合成 BGM 或上传音频兜底播放。
- 当前环境未提供 Supabase 凭证，真实跨设备云端分享尚未完成连通验收。
- 本地兜底模式下，上传图片和音频以 Data URL 存入 IndexedDB，适合本机验收，不适合作为长期线上存储。
- 阶段 4 已接入基础 MediaPipe 手势识别，但当前阈值仍是启发式，需要真机调参。
- 当前双手融合、左右复合信号、整手开合和捏合状态机阈值均为启发式，需要根据用户真机反馈继续调参。
- MediaPipe wasm 和模型依赖外部 CDN / Google 模型地址，离线或网络受限时会影响摄像头手势识别，但触摸模式仍可用。
- 摄像头唤起稳定性仍受浏览器站点权限、HTTPS / localhost 安全上下文、摄像头设备占用和移动浏览器策略影响；手机端通过 `http://192.168.2.9:3000` 访问通常不是安全来源，无法真实唤起摄像头，需 HTTPS 本地入口或 HTTPS 部署后验收。

### 阶段 2 云端验收待办

- 配置 `.env.local`：

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=bloombeat-gifts
```

- 创建 Supabase Storage bucket。
- 创建 `gifts` 表：`id text primary key`、`gift jsonb not null`、`created_at timestamptz default now()`。
- 验证图片、音频上传到 Supabase Storage。
- 验证 Gift 保存到 Supabase Database。
- 清空 IndexedDB 后验证 `/gift/[id]` 仍可从云端读取。

### 阶段 3 后续待办

- 设计并实现真实音乐服务适配层：
  - `parseMusicLink(url)`
  - `searchMusic(keyword)`
  - `getSystemBgms()`
- 接入用户自有音乐 API 时，优先返回歌曲名、歌手、专辑、封面、mp3 / audioUrl。
- 真实播放地址不可用时继续保留上传音频和系统 BGM 兜底。
- 系统 BGM 编辑作为独立模块：扩充 preset、音色、速度、旋律组合。
- 后续可把 mock 数据替换为真实 API 数据，不重写选歌页面。

### 阶段 4 待办

- 真机验证并调参 MediaPipe 手势识别。
- 已将摄像头识别到的 4 类基础手势映射到数据面板和花园交互：
  - 掌心上移 / 下移 -> 高度。
  - 掌心横向速度 + 手掌左右倾斜 + 指尖横摆 -> 风力 / 左右摇晃。
  - 张开五指并拢双拳 -> 开合。
  - 拇指与食指孔雀形状捏合 -> 捏合状态机换色。
- 真机验证摄像头授权、拒绝授权和触摸兜底。
- 真机摄像头验收必须使用 HTTPS 或浏览器认可的安全来源；局域网 HTTP 入口只能验收触摸兜底和安全来源提示。
- 真机验证双手统一轨迹、双手同向融合、冲突时右手优先、开合防抖和捏合换色阈值。
- 真机验证左右手向屏幕同一方向移动时风向一致。
- 真机验证掌心上移 / 下移控制高度是否自然。
- 真机验证掌心小幅上下 / 左右移动是否比上一版更灵敏。
- 真机验证花朵处于较高或较低位置时，左右摇晃是否仍能识别。
- 真机验证灵敏度增强后，上下 / 左右、开合和捏合之间是否出现明显串扰。
- 真机优先验证张开五指 / 并拢双拳是否恢复稳定，以及进入摄像头时花朵不会因手在低位直接变矮。
- 真机验证摄像头 / 触摸模式切换和问号引导是否按当前模式显示。
- 已完成：摄像头授权提示、失败自动进入触摸模式、摄像头画面不保存不上传、实时预览、数据面板显示摄像头 / 触摸模式、摄像头请求降级重试、MediaPipe 基础识别、摄像头 / 触摸手动切换、摄像头真机验收诊断信息。

### 阶段 5 待办

- 已完成：分享链接复制反馈优化，预览页和礼物页复制成功时按钮短暂显示 `已复制`，复制失败时提示手动复制。
- 已完成：新增 `src/lib/clipboard.ts`，提供剪贴板 API + textarea 复制兜底。
- 已完成：预览页 `/create/preview` 加载草稿前显示 `正在整理礼物预览`。
- 已完成：礼物页 `/gift/[id]` 加载礼物前显示 `正在打开这份礼物`。
- 已完成：预览页和礼物页加载提示最短可见约 720ms，避免一闪而过。
- 已完成：小屏布局与横向溢出修复，重点覆盖分享弹窗、底部按钮、主题卡片、数据面板、摄像头预览和礼物舞台。
- 已完成：手机端本地存储容错，IndexedDB 增加超时与内存兜底，localStorage 读写增加异常保护。
- 已完成：创作流程 `sessionStorage` 容错，避免受限浏览器中音乐、图片、主题、颜色选择和预览加载被中断。
- 已完成：开发环境允许 `localhost`、`127.0.0.1`、`192.168.2.9` 作为 Next dev 来源，方便电脑和手机验收。
- 已完成：手机音频入口收窄为 `.mp3/.wav/.m4a`，AMR 明确拒绝并提示。
- 已完成：摄像头启动前检查安全上下文，手机局域网 HTTP 页面无法唤起摄像头时给出明确提示并保留触摸模式。
- 已完成：手机端左上角数据面板固定响应式宽度，风力 / 高度数字变化时不再撑动说明卡片。
- 已完成：失败态和空状态优化，覆盖选歌未选择 / 无推荐、内容页未上传图片、云端失败时不生成本机伪分享链接、礼物不存在失败页。
- 已完成：四个主题视觉区分强化，主题色会影响舞台光晕、数据面板、音乐盒、草地、叶子、音符、花心和内容页主题卡片选中态。
- 已完成：主题默认背景图能力，背景优先级为用户上传图 > 主题默认图 > 主题渐变兜底。
- 已完成：动画自然度和舒缓感打磨，祝福语、花朵、风线、音符和粒子动画都已降速并降低跳动强度。
- 已完成：花朵和音乐盒细节精修，花瓣、花心、茎叶增加轻量高光和阴影层次，音乐盒增加顶部层次和装饰线。
- 已完成：全站 UI 细节统一精修，新增 `.page-title` 统一选歌页 / 内容页标题，输入框 / 按钮统一 focus 态，内容页图片上传改为自定义 `.upload-image-box` 与选歌页音乐上传控件一致，首页第一屏加入 CSS 品牌花朵和浮动花瓣并保持单一 `开始制作` 主操作。
- 阶段 5 主要模块均已实现，待用户逐项实机确认；后续重点转向阶段 4 HTTPS 真机摄像头手势调参或阶段 2 Supabase 跨设备分享验收。

## 5. 重要文件修改记录

### 数据与存储

```txt
src/lib/gift.ts
```

- GiftDraft、主题、默认值、localStorage 轻量草稿。
- 主题配置包含 `backgroundImage`、`backgroundPositionX`、`backgroundPositionY`、`backgroundScale`，用于系统默认主题背景图。
- 重要字段：
  - `songSourceType: "upload" | "default" | "link" | "recommendation"`
  - `musicSelected`
  - `audioUrl`
  - `backgroundImageUrl`
  - `backgroundPositionX`
  - `backgroundPositionY`
  - `backgroundScale`
  - `blessingColor`
  - `blessingDensity`
  - `blessingLineGap`
- 默认称呼为 `TA`。
- `GestureState.mode` 已扩展为 `"camera" | "touch"`，为阶段 4 摄像头模式预留状态。
- 阶段 5 修复：localStorage 读写增加异常保护，受限浏览器中不再打断点击交互。

```txt
src/lib/localGiftStore.ts
```

- IndexedDB 本地礼物 / 草稿存储。
- 保存上传音频 / 图片 Data URL。
- 生成本地 `giftId`。
- 阶段 5 修复：IndexedDB 打开增加超时和内存兜底，避免移动端存储异常导致页面卡在加载状态。

```txt
src/lib/creationFlow.ts
```

- 阶段 3 新增。
- 使用 sessionStorage 区分当前创作流程、重新打开创作链接和从礼物页返回编辑。
- 控制刷新清空上传资源、从交互页返回保留上传记录。
- 阶段 5 修复：sessionStorage 读写均已加 try/catch，受限时不再阻断创作主流程。

```txt
src/lib/mockMusic.ts
```

- 阶段 3 新增。
- 本地 mock 音乐库、平台识别、链接 mock 解析和推荐搜索。
- 后续真实 API 可替换这里或接入同形状适配层。

```txt
src/lib/cloudGiftStore.ts
src/lib/supabaseAdmin.ts
```

- Supabase 云端保存 / 读取和服务端 helper。
- 未配置时触发本地兜底。

```txt
src/lib/clipboard.ts
```

- 阶段 5 新增。
- `copyTextToClipboard(text)` 优先使用 `navigator.clipboard.writeText`。
- 剪贴板 API 不可用或失败时，回退到隐藏 textarea + `document.execCommand("copy")`。
- 供预览页分享弹窗和礼物页转发弹窗复用，保证复制成功 / 失败都有反馈。

```txt
next.config.ts
```

- 阶段 5 修复：配置 `allowedDevOrigins`，允许 `localhost`、`127.0.0.1`、`192.168.2.9` 作为本地验收来源。

### 页面

```txt
src/app/page.tsx
```

- 引导首页。
- 点击 `开始制作` 时清空草稿并开启创作流程。

```txt
src/app/create/page.tsx
```

- `/create` 重定向到 `/`。

```txt
src/app/create/song/page.tsx
```

- 阶段 3 选歌页核心。
- 四方式互斥选择、当前选择、链接识别、歌曲推荐、本地音频回选、系统 BGM。
- 所有试听 10 秒，且互斥停止。

```txt
src/app/create/content/page.tsx
```

- 内容编辑页。
- 称呼、祝福、背景图片、主题、字号、颜色、速度、占比、行距。
- 遵守创作流程重置 / 保留规则。

```txt
src/app/create/preview/page.tsx
```

- 预览页。
- GiftExperience 预览、分享弹窗、生成云端或本地 `/gift/[id]`。
- 刷新时清空上传资源。
- 创作者预览页通过共用 `GiftExperience` 获得与收礼页一致的摄像头 / 触摸引导。
- 阶段 5 新增分享复制反馈：复制成功后按钮短暂显示 `已复制`，失败时提示手动复制。
- 阶段 5 新增加载状态：草稿读取完成前显示 `正在整理礼物预览`，最短可见约 720ms。

```txt
src/app/gift/[id]/page.tsx
```

- 收礼人礼物页。
- 优先云端读取，再本地兜底。
- 从预览进入时显示 `返回`，并标记回编辑保留上传记录。
- 阶段 5 新增转发复制反馈：复制成功后按钮短暂显示 `已复制`，失败时提示手动复制。
- 阶段 5 新增加载状态：礼物数据读取完成前显示 `正在打开这份礼物`，最短可见约 720ms。

### 组件

```txt
src/components/GiftExperience.tsx
```

- 交互礼物核心。
- 背景、花园、祝福语波浪、触摸交互、数据面板、引导蒙层。
- 点击 `我知道了` 后才允许音乐启动。
- 阶段 4-1 增加摄像头授权入口、实时摄像头预览、摄像头 / 触摸模式切换、摄像头失败触摸兜底和摄像头启动降级重试。
- 摄像头流通过 `getUserMedia` 获取，只绑定页面 video 元素，不写入 IndexedDB、localStorage、Gift 或上传接口。
- 阶段 4 增加 MediaPipe HandLandmarker 初始化、视频帧检测循环和基础手势映射。
- MediaPipe 模型和 wasm 运行时使用外部地址；失败时回退触摸模式。
- 阶段 4 新增摄像头诊断信息：`window.isSecureContext`、`navigator.mediaDevices.getUserMedia` 支持情况、Permissions API 摄像头权限状态和最近错误名。

```txt
src/components/SynthBgmButton.tsx
```

- 音乐播放按钮。
- 支持上传音频和合成 BGM。
- `autoStart` 控制是否挂载后自动尝试播放。

```txt
src/components/GiftBackground.tsx
```

- 统一背景渲染。
- 内容页预览和最终礼物页共用。
- 背景优先级：用户上传图片 > 主题默认背景图 > 主题渐变兜底。

```txt
src/components/AppHeader.tsx
```

- 顶部品牌和步骤显示。

### 样式

```txt
src/app/globals.css
```

- 全局布局、手机框、表单、选歌卡片、上传音乐框、分享弹窗、礼物舞台、花园、祝福语、喇叭按钮等样式。
- 阶段 4-1 新增摄像头预览、双区块引导卡、摄像头手势四板块和触摸兜底教程样式。
- 阶段 4-3 新增摄像头状态标签样式。
- 阶段 4 新增摄像头诊断卡片样式。
- 阶段 5 新增复制成功反馈样式、加载卡片和加载点动画。
- 阶段 5 新增花朵和音乐盒细节：花瓣 / 花心 / 茎叶高光阴影、叶脉、音乐盒顶部层次和装饰线。

### 文档与日志

```txt
docs/06-api-and-data-spec.md
docs/07-development-roadmap.md
docs/08-acceptance-checklist.md
docs/10-coding-agent-rules.md
docs/11-session-handoff.md
dev-logs/2026-06-24.md
dev-logs/2026-06-25.md
docs/12-vibe-coding-continuation-prompt.md
```

- 阶段、验收、API、风险、交接和开发日志。

## 6. 整体架构思路

### 路由结构

```txt
/
/create
/create/song
/create/content
/create/preview
/gift/[id]
```

### 主流程

```txt
/ 引导页
  -> 点击开始制作，清空旧草稿并开启创作流程
  -> /create/song 选择音乐
  -> /create/content 填写称呼 / 祝福 / 图片 / 主题
  -> /create/preview 预览礼物
  -> 生成 /gift/[id]
  -> /gift/[id] 收礼人互动
```

### 数据流

```txt
用户输入
  -> GiftDraft
  -> localStorage 保存轻量草稿
  -> IndexedDB 保存完整草稿和 Data URL 大资源
  -> 预览页读取 IndexedDB 草稿
  -> 生成 giftId
  -> 预览页优先 Supabase 保存 Gift
  -> Supabase 保存成功后才生成可复制转发链接
  -> Supabase 不可用或保存失败时，不生成面向用户的本机分享链接
  -> /gift/[id] 优先云端读取，再保留本地兜底用于开发 / demo 验收
  -> GiftExperience 渲染
```

### 音乐能力架构

```txt
选歌页 UI
  -> mockMusic 当前本地解析 / 推荐
  -> 后续可替换为 parseMusicLink / searchMusic API
  -> GiftDraft 保存最终选中的一首歌
  -> GiftExperience / SynthBgmButton 播放上传音频或系统合成 BGM
```

### 摄像头手势架构（阶段 4）

```txt
GiftExperience 引导层
  -> 点击 `点击启动摄像头`
  -> navigator.mediaDevices.getUserMedia
      -> 优先请求前置摄像头
      -> 失败后降级请求任意摄像头
  -> 成功：保存 MediaStream 到 ref，只绑定 video 预览
      -> GestureState.mode = "camera"
      -> 数据面板显示模式 摄像头
      -> 引导展示 4 个摄像头手势板块
      -> 后台加载 MediaPipe HandLandmarker
      -> 绘制整手骨架、手掌轮廓、拇指 / 食指点和掌心轨迹
      -> 双手同向融合，路径差异较大时右手优先；无 handedness 信息时选择画面中心最近的手
      -> 掌心上移 / 下移控制高度
      -> 掌心横向速度 + 手掌左右倾斜 + 指尖横摆控制风力
      -> 整手伸展控制开合
      -> 捏合状态机控制换色
      -> 用户可手动切换到触摸模式
  -> 失败：停止 tracks，清空 stream ref
      -> GestureState.mode = "touch"
      -> 显示触摸兜底教程
  -> 触摸模式：用户可重新启动 / 回到摄像头手势识别
  -> 组件卸载：停止所有 camera tracks
```

当前 MediaPipe HandLandmarker 已接入 `cameraStreamRef` / video 输入；实现仍不改变 Gift 数据结构，不保存、不上传摄像头画面。

### 创作流程控制

```txt
sessionStorage creation-flow 标记
  -> 判断是否为当前创作流程
  -> 新开创作链接回引导页
  -> 刷新创作页保留上传资源
  -> 从礼物效果返回编辑时保留上传资源
```

### 兜底原则

- 音乐 API 失败：mock / 推荐 / 上传音频 / 系统 BGM。
- 上传失败：明确提示，允许重试或改用默认。
- Supabase 失败：不生成面向用户的可转发链接，保留触摸 / 预览和开发用本地兜底。
- 摄像头失败：触摸模式。
- 摄像头不可用或权限拒绝：触摸模式和触摸教程。
- 前置摄像头不可用：自动降级请求任意摄像头。

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
dev-logs/2026-06-25.md
```

推荐启动命令：

```powershell
cd C:\Users\张喆勤\BloomBeat
npm.cmd install
npm.cmd run dev -- --hostname 0.0.0.0 --port 3000
```

如果电脑重启后需要为验收重新配置测试环境：

```powershell
cd C:\Users\张喆勤\BloomBeat
npm.cmd install
npm.cmd run dev -- --hostname 0.0.0.0 --port 3000
```

如果由 Codex 后台启动 dev server，为避免普通沙箱命令结束后清理后台进程，应使用沙箱外启动方式，并把日志写入 `dev-server.log`。启动后至少验证：

```txt
http://localhost:3000/
http://localhost:3000/create/song
http://localhost:3000/create/content
http://localhost:3000/create/preview
http://localhost:3000/gift/demo
http://192.168.2.9:3000/
```

常用验证命令：

```powershell
npm.cmd run build
```

当前建议：

1. 阶段 5 主要模块（含全站 UI 细节统一精修）均已实现，待用户逐项实机确认；确认后可将重点转向阶段 4 HTTPS 真机摄像头手势调参。
2. 若回补阶段 2，优先配置 Supabase 并做跨设备分享验收。
3. 若继续阶段 3，优先接真实音乐 API 数据源或系统 BGM 编辑，不重写页面。
4. 若继续阶段 4，优先在 HTTPS 本地入口或 HTTPS 部署环境中做真机摄像头手势调参；先看引导层诊断卡确认安全来源、权限和最近错误，再验收张开 / 握拳、初始高度基准、左右 / 上下串扰、捏合换色和摄像头 / 触摸切换。
5. 若由其他协作者继续 vibe coding，可直接复制 `docs/12-vibe-coding-continuation-prompt.md` 的完整指令作为新会话开场。

---

## 8. 2026-06-26 阶段 7 收口上下文（stage-8 快照前）

### 当前关键决策

- `/create/preview` 定义为最终预览与发布页，不再额外跳转“礼物效果”页；制作者在同一页完成最终确认、弹幕开关、命名和分享。
- 分享弹层中的礼物名称默认取编辑页昵称，格式为 `给XX的礼物`；昵称为空时回落 `给TA的礼物`。
- 用户可在分享弹层编辑礼物名称，编辑后即时同步礼品卡题目、草稿和后续分享链接。
- 分享链接优先尝试云端保存；云端未配置时降级生成 `/gift/share#bloombeat=...` 自包含链接。自包含链接不携带上传音频和 data URL 图片，跨设备上传资源仍依赖后续 Supabase。
- 制作者可在最终预览页单独开关祝福弹幕；该状态写入草稿和分享 hash。
- 当前仍不跳阶段：这些改动都属于阶段 7 数据流 / 制作体验收口，不代表阶段 2 Supabase 已完成。

### 已完成部分

- 选歌页：
  - 本地音频上传限制调整为 10MB。
  - 系统 BGM / 上传音频 / 推荐 / 链接解析保持互斥选择。
- 内容页：
  - 称呼输入框允许完全清空，预览默认回落 TA。
  - 背景图片上传限制调整为 8MB。
  - 背景图支持压缩、位置和缩放；不上传时使用主题默认背景。
  - 主题色会同步影响 range 控件强调色。
  - 祝福颜色更新同时写 localStorage 与 IndexedDB，避免预览页读到旧草稿。
- 预览页：
  - 底部主流程为 `返回编辑 + 完成并分享`。
  - 右下角操作改为祝福弹幕开关。
  - 分享弹层支持编辑礼物名称、生成链接、复制链接和系统分享。
  - 复制成功时按钮进入绿色 `copy-done` 成功态并显示 `已复制`。
- 礼物页 / GiftExperience：
  - 弹幕层读取 `blessingMarqueeEnabled`。
  - 音乐按钮改为音量入口；弹出竖向音量滑杆。
  - 音量为 0 或未播放时显示静音喇叭图标。
  - `giftCodec` 对缺失字段使用 `defaultGift` 兜底，避免旧 hash 撑坏动效参数。

### 重要文件修改记录

- `src/app/create/song/page.tsx`：音频上传大小和提示文案。
- `src/app/create/content/page.tsx`：称呼清空、背景图片 8MB、主题色 CSS 变量、草稿双写、祝福颜色保存。
- `src/app/create/preview/page.tsx`：最终预览发布页、弹幕开关、分享命名、云端优先 / 自包含兜底链接、复制反馈。
- `src/app/gift/[id]/page.tsx`：分享 hash / demo / 云端礼物读取与音频缺失提示。
- `src/components/GiftExperience.tsx`：弹幕显示开关、摄像头调参面板、音量组件接入、礼物舞台渲染。
- `src/components/SynthBgmButton.tsx`：竖向音量面板、手动音量、静音图标。
- `src/lib/gift.ts`：`GiftDraft.blessingMarqueeEnabled` 和默认值。
- `src/lib/giftCodec.ts`：分享 hash 编解码字段清洗与默认兜底。
- `src/lib/localGiftStore.ts`：IndexedDB / 内存 / window cache 草稿兜底。
- `src/lib/gestureConfig.ts`、`src/components/GestureDebugPanel.tsx`：摄像头手势真机调参能力。
- `src/app/globals.css`：分享弹层、复制成功态、竖向音量、主题 range、预览 toast 等样式。
- `docs/12-gesture-tuning.md`：真机手势调参说明。
- `docs/13-stage-7-dataflow-fixes.md`：阶段 7 数据流修复背景与方案。
- `dev-logs/2026-06-26.md`：当天完整实现与验收记录。

### 整体架构思路

```txt
选歌页
  -> GiftDraft 保存最终音乐选择
  -> saveDraft(localStorage) + saveLocalDraft(IndexedDB)

内容页
  -> 编辑 recipientName / blessing / theme / background / blessingColor
  -> 轻字段写 localStorage
  -> 大资源和完整草稿写 IndexedDB + window cache

预览发布页
  -> getLocalDraft + getDraft 合并，优先保留最新轻字段，同时保留 IndexedDB 大资源
  -> GiftExperience 即时预览
  -> 弹幕开关写入 GiftDraft
  -> 分享弹层编辑 title 并同步礼品卡
  -> saveCloudGift 成功：生成 /gift/[id]
  -> saveCloudGift 失败：生成 /gift/share#bloombeat=...

收礼页
  -> /gift/[id] 云端读取
  -> /gift/demo 本地草稿读取
  -> /gift/share hash 解码
  -> GiftExperience 只读互动
```

### 待办事项

- 阶段 2：配置 Supabase，验证真实跨设备分享；上传音频和背景图应进入 Storage，分享链接应优先为 `/gift/[id]`。
- 阶段 3：接真实音乐 API 或扩展系统 BGM 编辑，保持四方式互斥选择。
- 阶段 4：在 HTTPS / Vercel 环境做真机摄像头调参，将调参面板确认后的默认值固化进 `gestureConfig.ts`。
- 阶段 5 / 7 回归：继续手机端验收分享复制成功态、系统分享路径、8MB 图片上传和 10MB 音频上传。

### 下次新会话优先读取

```txt
README.md
docs/00-project-overview.md
docs/01-prd.md
docs/07-development-roadmap.md
docs/08-acceptance-checklist.md
docs/10-coding-agent-rules.md
docs/11-session-handoff.md
docs/12-gesture-tuning.md
docs/13-stage-7-dataflow-fixes.md
dev-logs/2026-06-26.md
```
