# Coding Agent 工作规则

1. 项目名称必须使用 BloomBeat（花律）。
2. 每次开发前先阅读相关 docs 文件。
3. 必须按 `docs/07-development-roadmap.md` 阶段顺序开发。
4. 每次只完成一个阶段或一个明确功能模块。
5. 每阶段完成后必须按 `docs/08-acceptance-checklist.md` 验收。
6. 每次完成开发后必须更新 `dev-logs/YYYY-MM-DD.md`。
7. 如果当天日志不存在，必须创建。
8. 日志必须包含：今日完成、今日验证、待办事项、风险 / 阻塞、下一步计划。
9. 高风险能力必须有兜底：
   - 音乐 API 失败 → mock / 默认 BGM
   - 摄像头失败 → 触摸模式
   - 上传失败 → 明确提示并允许重试
10. 不允许为了复杂功能破坏已有主流程。
11. 不要一口气实现所有阶段。
12. 阶段 1 禁止接入 Supabase、真实音乐 API、MediaPipe、登录和录屏。
