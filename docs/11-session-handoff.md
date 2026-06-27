# BloomBeat Session Handoff

Updated: 2026-06-28

This file is the clean entry point for the next Codex session. Prefer this document and `docs/19-stage-10-context.md` over older mojibake sections in historical docs.

## Current Position

- Project: BloomBeat, an interactive music gift H5.
- Local path: `C:\Users\<current-user>\BloomBeat`
- Current branch before Stage 10 snapshot: `stage-8`
- Current GitHub origin: `https://github.com/zhangzheqin111/BLOOMBEAT.git`
- Current runtime validation server: `http://127.0.0.1:3001`
- LAN validation base: `http://192.168.2.9:3001`
- Latest HTTPS validation tunnel: `https://robot-remind-fig-render.trycloudflare.com`
- Stage 10 snapshot repository target: `https://github.com/zhangzheqin111/stage-10`
- Local Stage 10 snapshot commit: latest commit on branch `stage-10`
- Push status: pending because the local environment could not connect to `github.com:443` during the push attempt.

## Product Decisions

- Do not skip stages. Follow `docs/07-development-roadmap.md`.
- Work on only one stage or one clearly bounded module per turn.
- Validate against `docs/08-acceptance-checklist.md` after each module.
- Update `dev-logs/YYYY-MM-DD.md` after each turn.
- Do not break the existing create -> preview -> share -> gift main flow.
- Every response to the user must include complete validation links, what to validate, and the next planned step.
- Camera testing on mobile is deferred until HTTPS deployment or a reliable HTTPS tunnel, because LAN HTTP is not a secure context for `getUserMedia`.

## Completed Snapshot

### Stage 1-7

- Static MVP, touch interaction, music box, blessing text, themes, upload flow, local IndexedDB fallback, share and gift pages are in place.
- System BGM, mock music parsing/search, uploaded audio, uploaded image, content editing, preview, and gift loading are implemented.
- Stage 7 closed the final preview/share route shape: `/create/preview` is the final creation confirmation page, and `/gift/[id]` is the recipient page.

### Stage 8

- Supabase-backed share links are working for validated gifts.
- Uploaded audio/image can be converted to public URLs before final share generation.
- Preview share generation blocks local `data:` media from becoming cross-device links.
- Mobile non-camera flow has LAN validation coverage.
- Visible UI mojibake in the key gift, preview, song, and BGM controls has been repaired.
- Camera on mobile over LAN HTTP is known to fail by browser security policy; leave it for HTTPS.

### Stage 9

- Repeatable smoke validation added with `npm.cmd run validate:stage9`.
- HTTPS quick-tunnel validation is working.
- Preview/mobile layout was tuned for bottom actions, garden placement, camera panel pressure, and guide-button placement.
- Gesture open/close no longer updates while the hand is visibly moving for height/wind control.
- Uploaded audio no longer blocks first link generation; pending audio sync writes back to the same gift ID.
- Supabase Storage is the default durable media upload path.
- Local server media is explicit validation/fallback only.
- Gesture debug UI is hidden by default and gated behind development/debug flags.

## Important Modified Files

- `.gitignore`
  - Ignores local runtime scratch logs such as dev server, tunnel, production server, and Cloudflare logs.
- `src/app/create/preview/page.tsx`
  - Adds media preparation error state and retry button before share-link generation.
  - Prevents generation while audio/image preparation still depends on local `data:` URLs.
- `src/app/create/song/page.tsx`
  - Cleans visible music-selection copy and removes temporary debugging logs.
  - Preserves system BGM, upload, parse, search, and selected-track behavior.
- `src/app/gift/[id]/page.tsx`
  - Cleans gift loading, forwarding, and share copy.
  - Preserves recipient gift loading and forwarding logic.
- `src/components/GiftExperience.tsx`
  - Fixes visible mojibake in guide labels, camera waiting hint, and wind display.
  - Keeps camera/touch fallback behavior unchanged.
- `src/components/SynthBgmButton.tsx`
  - Cleans BGM panel labels and preserves playback, pause, resume, mute, restore, and volume behavior.
- `docs/16-stage-8-context-and-debugging.md`
  - Source of truth for Stage 8 context and debugging notes.
- `docs/17-stage-9-context.md`
  - Current clean Stage 9 planning and handoff context.
- `docs/19-stage-10-context.md`
  - Current clean Stage 10 snapshot context, decisions, architecture, recurrent errors, and next TODOs.

## Architecture Notes

- Next.js App Router is used for pages and API routes.
- Creation pages read and write a draft through local browser storage helpers.
- Large media should be uploaded through server/cloud preparation before a cross-device gift link is generated.
- Gift data is fetched through `/api/gifts/[id]` and rendered through shared gift experience components.
- Recipient pages must not expose edit entry points; forwarding only changes the share title/name.
- `GiftExperience` owns the interactive stage, camera/touch mode, gesture state, blessing display, and control overlays.
- Camera frames are local-only and are not stored, uploaded, or written into gift data.

## Recurrent Error Causes and Rules

### Mojibake

Causes:

- Editing Chinese text through shell commands or terminals that do not preserve UTF-8.
- Copying already-garbled terminal output back into source files.
- Trusting PowerShell display output for Chinese API responses.

Rules:

- Use `apply_patch` for Chinese source and docs edits.
- Prefer Node `fetch` or browser visual checks when validating Chinese JSON.
- Run a focused mojibake scan before closing text/UI work.
- Run `npm.cmd run build` after repairing JSX text.

### Mobile Camera

Causes:

- `getUserMedia` requires a secure context on mobile browsers.
- LAN HTTP such as `http://192.168.2.9:3001` is not enough for real camera validation.
- Device permission, browser capability, and MediaPipe loading can fail independently.

Rules:

- Do not treat LAN HTTP camera failure as an app regression.
- Keep touch fallback available and testable.
- Defer camera pass/fail decisions to HTTPS deployment or a stable HTTPS tunnel.

### Share Links and Uploaded Media

Causes:

- Hash fallback links cannot reliably carry uploaded media across devices.
- A user can generate too early if audio/image preparation has not completed.
- Local `data:` URLs are not valid cross-device media references.
- Local server media URLs are temporary unless the deployment filesystem is durable.

Rules:

- Cross-device gifts must use `/gift/[id]` links backed by saved gift data.
- Uploaded media should become Supabase public URLs before final share generation in formal deployment.
- Server media URLs are reserved for explicit validation/fallback with `NEXT_PUBLIC_BLOOMBEAT_FAST_MEDIA=1` and `BLOOMBEAT_SERVER_MEDIA_ENABLED=1`.
- If preparation fails, show a retry path and do not create a misleading final link.

### Debug UI Leakage

Causes:

- Gesture tuning/debug panels can be useful during development but confusing in the recipient flow.

Rules:

- Gesture debug UI is hidden by default in production/recipient-facing builds.
- It is available in development, or explicitly with `NEXT_PUBLIC_BLOOMBEAT_GESTURE_DEBUG=1` / `?gestureDebug=1`.
- User-facing labels should describe behavior, not raw internal thresholds.

## Validation Links

Local:

- `http://127.0.0.1:3001/`
- `http://127.0.0.1:3001/create/song`
- `http://127.0.0.1:3001/create/content`
- `http://127.0.0.1:3001/create/preview`
- `http://127.0.0.1:3001/gift/gift-mqwgelr1-6c6f22e0`
- `http://127.0.0.1:3001/gift/gift-mqv7kqc8-10a79722`

LAN:

- `http://192.168.2.9:3001/`
- `http://192.168.2.9:3001/create/song`
- `http://192.168.2.9:3001/create/content`
- `http://192.168.2.9:3001/create/preview`
- `http://192.168.2.9:3001/gift/gift-mqwgelr1-6c6f22e0`
- `http://192.168.2.9:3001/gift/gift-mqv7kqc8-10a79722`

## Next Recommended Step

Proceed with final Stage 10 regression:

- Preserve the current working Stage 9 behavior.
- First push the latest local `stage-10` commit to the Stage 10 snapshot repository once GitHub network access is available.
- Run `npm.cmd run validate:stage9` against the active base URL before each deployment handoff.
- Then continue final HTTPS mobile regression and production deployment hardening.
