# 阶段 4 真机调参手册

> 适用版本：stage-7 起的 GiftExperience。
> 适用场景：摄像头手势在真机上跑通后调参，达到稳定识别。

## 1. 为什么需要真机调参

MediaPipe HandLandmarker 在不同手机上的**前摄分辨率、FPS、肤色光线响应**差异很大。电脑端 localhost 调出的参数搬到手机会有：

- 高度响应迟钝或过于敏感
- 张开 / 闭合判定不灵敏
- 捏合换色没反应或被风噪声误触
- 双手融合反复在"主手"和"融合"间跳

BloomBeat 把所有阈值抽到 `src/lib/gestureConfig.ts`，并在礼物页提供**实时调试面板**，让你在真机上一边看一边拖滑块。

## 2. 真机验收的 HTTPS 来源（重要）

手机浏览器只在 **secure context**（HTTPS 或 `localhost`）下允许摄像头。`192.168.x.x` 的局域网 HTTP 一定不能唤起摄像头——这是浏览器安全策略，不算 bug。

| 方式 | 难度 | 优点 | 缺点 |
|---|---|---|---|
| 部署到 Vercel / Cloudflare Pages | ★ | 拿到真 HTTPS，分享二维码 | 需要云账号，外部链接 |
| `cloudflared tunnel` 或 `ngrok` 内网穿透 | ★★ | 即开即用，无需账号 | 链接每次变化，依赖外网 |
| 手机 USB 调试 + Chrome DevTools Port Forwarding | ★★★ | 全程本地 | 需数据线，配置较繁琐 |
| Chrome 桌面端 localhost 直测 | ★ | 不用手机 | 视野 / 距离 / 肤色与真机有差异 |
| 局域网 HTTP 直连 | ✕ | — | **永远无法唤起摄像头，禁止选此方式** |

### 2.1 推荐的 Vercel 部署

```bash
cd C:\Users\张喆勤\BloomBeat
npx vercel
```

按提示关联项目，几分钟拿到 `https://bloombeat-xxx.vercel.app` 公网 HTTPS 链接。直接用手机浏览器打开 `/gift/demo` 即可验收。

> BloomBeat 用 `app/` + Turbopack，Next.js 16 已默认支持 Vercel。

### 2.2 推荐的 cloudflared 内网穿透

```bash
# 终端 A：启动 dev server
cd C:\Users\张喆勤\BloomBeat
npm.cmd run dev -- --hostname 0.0.0.0 --port 3000

# 终端 B：临时开 https 隧道
npx cloudflared tunnel --url http://localhost:3000
```

拿到 `https://xxxx.trycloudflare.com` 链接，手机浏览器扫码 / 直接打开 `/gift/demo`。

## 3. 调参面板使用方法

礼物页在**摄像头模式**下，右下角会出现一个**"调参 ▴"** 浮标（移动端左下角）。点开后可以看到：

- **实时**：FPS、手数（0/1/2）、融合（单手 / 双手）、捏合比、张开分、高度、风力
- **最近 30 帧手数分布**：柱状图
- **阶段提示**：例如 "已识别 30 帧 · 24 FPS · 单手"
- **20 个可调阈值滑块**：每个标注了"调大 / 调小"会带来的体感变化
- **恢复默认** 按钮：所有阈值回到原始值

所有调节都自动写入 `localStorage.bloombeat-gesture-config`，刷新页面后保留。

## 4. 阈值含义与调参策略

下面 20 个阈值按"调参顺序"排列。先调**最常出问题的**几项，再视情况微调其余。

### 4.1 张开 / 闭合

- `openSpreadThreshold`（默认 1.28）：手指张开判定阈值
  - 调大：必须把手张得很大才识别
  - 调小：手指稍分开就识别
- `openDebounceMs`（默认 200）：候选状态保持多少毫秒才确认
  - 调大：稳定不闪烁
  - 调小：跟手但可能闪
- `openTransitionKeep`（默认 0.7）：开合过渡时高度 / 风力保留比例
  - 调大：开合时上下 / 左右信号被大幅压住
  - 调小：开合时仍允许上下 / 左右

### 4.2 捏合换色

- `pinchTriggerRatio`（默认 0.42）：拇指尖和食指尖的距离 / 手掌宽度
  - 调大：必须真正贴近才识别
  - 调小：稍近就触发
- `pinchReleaseRatio`（默认 0.58）：完全张开的判定阈值
  - 调大：必须大幅张开才能再次捏合（防误触强）
  - 调小：稍微松开就允许下次
- `pinchCooldownMs`（默认 580）：两次捏合最短间隔

### 4.3 高度响应

- `heightDisplacementGain`（默认 185）：手抬高 → 高度变化的整体系数
  - 调大：手抬一点花朵就长高（更敏感）
  - 调小：必须抬很高才长高（更稳）
- `heightVelocityGain`（默认 170）：垂直方向瞬时速度对高度的额外贡献
  - 调大：挥手上下的瞬间花朵会"甩"一下
  - 调小：完全靠绝对位置
- `heightMaxStep`（默认 22）：相邻帧高度最大变化（防跳）
  - 调大：动作更跟手但会跳
  - 调小：动作平滑但跟手感弱

### 4.4 左右挥动 / 风力

- `horizontalVelocityGain`（默认 760）：手横向划过对风力的贡献
  - 调大：挥一次风力变化剧烈
- `horizontalOffsetGain`（默认 12）：手在画面左 / 右的稳定偏移
  - 调大：手只要在画面左 / 右侧就持续吹风
- `palmRollGain`（默认 74）：手腕倾斜 → 风力
  - 调大：手腕轻晃就有大风
- `fingertipSwingGain`（默认 52）：指尖横摆 → 风力
- `windMaxStep`（默认 24）：相邻帧风力最大变化

### 4.5 双手融合

- `twoHandDirectionTolerance`（默认 24）：双手风力方向差容忍度
- `twoHandHeightTolerance`（默认 34）：双手高度差容忍度
- `fusionStreakFrames`（默认 2）：触发融合需要连续满足的帧数

### 4.6 平滑与稳定性

- `palmSmoothKeep`（默认 0.38）：掌心坐标平滑保留比例
  - 调大：更跟手但抖动多
  - 调小：更平滑但跟手感弱
- `lostHandHoldMs`（默认 250）：找不到手时仍按上一帧继续的时长
  - 调大：手短暂离开画面仍继续控制
  - 调小：手离开立即重置

### 4.7 手势识别

- `movePixelThreshold`（默认 0.009）：上下 / 左右挥动识别阈值
- `moveYRatio`（默认 0.78）：上下 / 左右判定比
- `moveHeightDeltaThreshold`（默认 8）：高度跳变触发 vertical_wave
- `moveWindDeltaThreshold`（默认 9）：风力偏移触发 horizontal_wave

## 5. 真机诊断卡使用方式

引导层（点 "?" 按钮打开）在原来"安全来源 / 浏览器摄像头 / 权限 / 最近错误"四项之外，新增**真机诊断卡**：

- **设备**：显示 `navigator.userAgent` 第一段
- **摄像头分辨率**：`videoWidth × videoHeight`
- **首帧延迟**：从 `getUserMedia` 拿到流到 MediaPipe 识别出第一帧的毫秒数
- **已识别帧数**：累计有效帧
- **错误详情**：取 `Error.stack` 第一行，便于排查

如果在真机上 FPS 持续低于 15、首帧延迟超过 4 秒，请先检查：

1. 手机是否锁了屏幕 / 后台被杀
2. Chrome 浏览器是否给本链接授了"始终允许摄像头"
3. 是否遮挡了摄像头（手摸镜头）

## 6. 调参流程示例

> 场景：在 iPhone 13 上发现"花朵上下摆动有点迟钝，要把手抬很高"

1. 打开真机礼物页 → 启动摄像头 → 点 "调参"
2. 看 `heightDisplacementGain = 185`（默认）
3. 拖到 230（约 1.24 倍）
4. 抬手花朵明显跟手
5. 如果发现"手离开画面后花朵不动了"，可以同时把 `lostHandHoldMs` 调到 350
6. 满意后点 "调参" 收起

## 7. 兜底

任何调参都**不能破坏触摸兜底**：

- 摄像头没启动 / 失败 → 引导层"摄像头状态"显示"触摸兜底"
- 摄像头模式下点 "切换触摸" → 立即关摄像头，回到触摸交互
- 触摸模式：上下滑（高度）、左右滑（风力）、点击花朵（开合）、双击（换色）

## 8. 文件清单

- `src/lib/gestureConfig.ts` — 阈值定义、默认值、localStorage 读写
- `src/components/GestureDebugPanel.tsx` — 调试面板 UI + `useGestureConfigState` Hook
- `src/components/GiftExperience.tsx` — 接入 config、增加采样推入、增强真机诊断卡
- `src/app/globals.css` — 调试面板样式（`.gesture-debug-panel` 等）
