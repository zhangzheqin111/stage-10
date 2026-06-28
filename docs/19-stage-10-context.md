# Stage 10 Context

Updated: 2026-06-28

This document is the clean starting point for the next session. Read it together with:

- `README.md`
- `docs/11-session-handoff.md`
- `docs/17-stage-9-context.md`
- `docs/18-stage-9-https-deployment-runbook.md`
- `docs/08-acceptance-checklist.md`
- `docs/10-coding-agent-rules.md`

## Current Position

- Current working stage: Stage 10 snapshot preparation after Stage 9 mobile HTTPS validation.
- Current local path: `C:\Users\张喆勤\BloomBeat`
- Current branch before Stage 10 snapshot work: `stage-8`
- Stage 10 GitHub snapshot repository target: `https://github.com/zhangzheqin111/stage-10`
- Local Stage 10 snapshot commit: latest commit on branch `stage-10` (`Stage 10 snapshot`).
- Push status: pending because the local environment could not connect to `github.com:443` during the push attempt.
- Active local production server used in the latest validation: `http://127.0.0.1:3001`
- Active HTTPS validation tunnel used in the latest validation: `https://robot-remind-fig-render.trycloudflare.com`

GitHub repository names cannot safely contain a literal space, so the requested name `stage 10` should be represented as `stage-10`.

## Key Product Decisions

- Do not skip stages; work on one clear stage/module per turn.
- Preserve the create -> song -> content -> preview -> share -> gift main flow.
- `/create/preview` is the final creator preview and share page.
- `/gift/[id]` is the recipient page and must not expose editing entry points.
- Uploaded media should use Supabase Storage by default for durable cross-device sharing.
- Local server media URLs under `/api/media/...` are validation/fallback only and are not durable production storage.
- Camera frames are local-only; they are not stored, uploaded, or written into gift data.
- Mobile camera validation must use HTTPS. LAN HTTP camera failure is a browser security limitation, not an app regression.
- Raw gesture tuning/debug UI is hidden by default in production/recipient-facing builds.
- Debug UI may be enabled only in development, with `NEXT_PUBLIC_BLOOMBEAT_GESTURE_DEBUG=1`, or with `?gestureDebug=1`.

## Completed Work

### Core Flow

- Homepage, song selection, content editing, final preview, share generation, and recipient gift page are implemented.
- System BGM, mock QQ Music / Kugou parsing, recommendations, local audio upload, and image upload flows are present.
- Share links use saved gift records through `/api/gifts` and `/gift/[id]`.
- Existing validated gift IDs:
  - system BGM: `gift-mqwgelr1-6c6f22e0`
  - uploaded media: `gift-mqv7kqc8-10a79722`

### Stage 9 Mobile / HTTPS Stabilization

- Added repeatable smoke validation with `scripts/validate-stage9.mjs` and `npm.cmd run validate:stage9`.
- Fixed the earlier HTTPS static asset mismatch by enforcing a single production listener after rebuilds.
- Repaired the “unstyled page / page could not load” failure pattern caused by stale HTML pointing at missing `_next` assets.
- Improved mobile preview layout:
  - compact preview header,
  - one-row bottom actions,
  - lower garden/music card/control placement,
  - reduced camera/data-panel pressure,
  - guide buttons moved outside the guide card.
- Guarded camera open/close gestures so open palm up/down movement does not accidentally toggle flower open/close.
- Made uploaded music non-blocking for first share-link generation:
  - first save can create the link while audio is still syncing,
  - audio sync writes back to the same gift ID when complete.
- Restored durable upload policy:
  - default uploads go to Supabase Storage,
  - server media fallback requires explicit opt-in.
- Gated gesture debug UI behind explicit debug conditions.

## Important File Changes

- `scripts/validate-stage9.mjs`
  - Repeatable smoke test for core pages and known gift IDs.
- `package.json`
  - Adds `validate:stage9`.
- `src/app/api/upload/route.ts`
  - Supports JSON data URLs and multipart file uploads.
  - Defaults to Supabase Storage when configured.
  - Keeps server media fallback only when explicitly enabled or when Supabase is unavailable.
- `src/lib/cloudGiftStore.ts`
  - Adds `uploadCloudFile`.
  - Uses the fast server-media header only when `NEXT_PUBLIC_BLOOMBEAT_FAST_MEDIA=1`.
- `src/lib/mediaPreparation.ts`
  - Adds in-flight media preparation reuse via `rememberCloudResourcePreparation`.
- `src/app/create/song/page.tsx`
  - Starts audio upload earlier and registers the in-flight upload for preview reuse.
- `src/app/create/preview/page.tsx`
  - Allows initial share generation while only audio is pending.
  - Blocks generation while image is still local-only.
  - Syncs uploaded audio back to the same gift record.
- `src/components/GiftExperience.tsx`
  - Gesture movement guard for open/close.
  - Shared preview/gift flower-height formula.
  - Lowered visual composition and connected gated debug panel.
- `src/components/GestureDebugPanel.tsx`
  - Clean Chinese debug UI.
  - Hidden unless debug is explicitly enabled.
- `src/lib/gestureConfig.ts`
  - Central gesture thresholds and persistent tuning key `bloombeat-gesture-config`.
- `src/lib/serverMediaStore.ts` and `src/app/api/media/[id]/route.ts`
  - Validation/fallback local media serving.
- `src/app/globals.css`
  - Mobile preview, garden, guide, footer, camera, and control layout adjustments.
- `docs/11-session-handoff.md`, `docs/17-stage-9-context.md`, `docs/18-stage-9-https-deployment-runbook.md`
  - Updated handoff, Stage 9 context, validation, debug UI, and media storage rules.

## Architecture Summary

- Framework: Next.js App Router.
- Creation state:
  - browser draft state is temporary,
  - local draft/media helpers preserve in-progress creator state,
  - final cross-device links rely on saved gift records.
- API routes:
  - `/api/gifts` saves gift records,
  - `/api/gifts/[id]` reads gift records,
  - `/api/upload` uploads image/audio resources,
  - `/api/media/[id]` serves validation/fallback local media,
  - `/api/music/*` provides mock music parsing/search.
- Media:
  - Supabase Storage is the durable default,
  - server media is fallback only,
  - `data:` URLs must not be treated as final cross-device resources.
- Interaction:
  - `GiftExperience` owns the gift stage, touch/camera interaction, gesture state, flower rendering, music controls, blessing marquee, and guide overlay.
  - `SynthBgmButton` owns audio playback controls.
  - Camera gesture recognition uses MediaPipe and must fall back to touch mode.

## Common Errors And Fixes

### Mojibake / Garbled Chinese

Symptoms:

- Chinese UI or docs show broken mojibake characters instead of readable Chinese.

Fixes:

- Use `apply_patch` for Chinese source/docs edits.
- Do not copy PowerShell-rendered Chinese output back into source files.
- Run focused scans such as:

```powershell
rg "<known-mojibake-patterns>" src app docs
```

### HTTPS Page Loses CSS Or Later Pages Fail

Symptoms:

- Mobile HTTPS page renders like plain browser default HTML.
- Later pages show “This page could not load”.

Root cause:

- Multiple `next start` processes or a stale process serving HTML from a previous build while `_next` assets come from a newer build.

Fixes:

- Stop duplicate listeners on port `3001`.
- Rebuild with `npm.cmd run build`.
- Start exactly one production server.
- Verify all referenced `/_next/` CSS/JS assets return 200 before sharing the tunnel URL.

### Mobile Camera Does Not Start

Symptoms:

- Camera permission does not appear or camera mode cannot start on phone.

Root cause:

- Mobile browsers require secure context for `getUserMedia`.
- LAN HTTP is not enough.

Fixes:

- Validate camera only on HTTPS or localhost.
- Keep touch fallback available.
- Check permission, browser support, active camera use, then MediaPipe loading.

### Uploaded Music Makes Link Generation Slow

Symptoms:

- Share dialog stays on music preparation too long.

Fixes:

- Start upload on the song page as early as possible.
- Register the in-flight upload so preview does not restart it.
- Allow link generation while only audio is pending.
- Sync the final audio URL back to the same gift ID after upload completes.

### Temporary Media URL Risk

Symptoms:

- Gift works only while the current tunnel/server is alive.

Root cause:

- `/api/media/...` points to local server media storage.

Fixes:

- Use Supabase Storage by default.
- Enable server media only for validation/fallback:
  - `NEXT_PUBLIC_BLOOMBEAT_FAST_MEDIA=1`
  - `BLOOMBEAT_SERVER_MEDIA_ENABLED=1`

## Validation Checklist

Run before a handoff or snapshot:

```powershell
npm.cmd run build
npm.cmd run validate:stage9
npm.cmd run validate:upload-policy
```

For HTTPS:

```powershell
$env:STAGE9_BASE_URL="https://<host>"
npm.cmd run validate:stage9
```

Also verify:

- `/` returns 200.
- `/create/song`, `/create/content`, `/create/preview` return 200.
- known `/gift/[id]` pages return 200.
- referenced `/_next` CSS/JS assets return 200.
- default audio upload returns `storage: "supabase"`.
- debug panel is not visible in normal production/recipient flow.

## Open TODOs

- Push the latest commit from branch `stage-10` to `https://github.com/zhangzheqin111/stage-10` after GitHub network access is available.
- Complete final mobile HTTPS manual regression:
  - uploaded audio,
  - uploaded background image,
  - share link copied/opened on a second browser/device,
  - camera permission and touch fallback.
- Decide whether to deploy to Vercel or another HTTPS host for a more stable URL than quick tunnel.
- If moving to formal production, confirm Supabase table policies, public bucket behavior, storage cleanup policy, and service-role env configuration.
- Optionally run the explicit server-media fallback check with `STAGE10_CHECK_SERVER_FALLBACK=1` when the server was started with `BLOOMBEAT_SERVER_MEDIA_ENABLED=1`.

## Next Suggested Step

After the Stage 10 repository snapshot is available, run a focused final regression on the deployed/tunnel URL:

1. Create a gift with system BGM.
2. Create a gift with uploaded audio and image.
3. Open both links on another browser/device.
4. Validate camera permission under HTTPS.
5. Record device/browser results in `dev-logs/YYYY-MM-DD.md`.
