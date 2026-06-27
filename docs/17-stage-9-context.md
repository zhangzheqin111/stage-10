# Stage 9 Context

Updated: 2026-06-27

## Goal

Stage 9 should start from the current stable Stage 8 baseline and focus on deployment readiness, repeatable validation, and reducing the error patterns seen in recent sessions.

## Current Baseline

- The create -> song -> content -> preview -> share -> gift flow is implemented.
- `/create/preview` is the final creation confirmation route.
- `/gift/[id]` is the recipient route and should remain free of editing flow entry points.
- Supabase-backed gifts can preserve uploaded audio and uploaded background images as public URLs.
- The known validated uploaded-media gift is `gift-mqv7kqc8-10a79722`.
- The known validated system-BGM gift is `gift-mqwgelr1-6c6f22e0`.

## Stage 9 Repository Intention

The requested Stage 9 GitHub project should be a saved snapshot of the current working project, including:

- Source code fixes from Stage 8.
- Clean handoff/context docs.
- Updated development logs.
- No local `.env.local`, `.next`, `node_modules`, Cloudflare binary, server logs, or scratch runtime files.

GitHub repository name recommendation: `stage-9`.

Reason: GitHub repository URLs cannot contain a literal space in the path, so `stage-9` is the safest representation of the requested name `stage 9`.

## Architecture Summary

- Next.js App Router provides the UI routes and API routes.
- Browser draft state is used during creation and should be treated as temporary.
- Cross-device gift links must depend on saved gift records and public media URLs.
- Supabase Storage is the intended media persistence layer for uploaded audio and images.
- Gift rendering is centralized through `GiftExperience`.
- Touch interaction is the required fallback for every camera path.
- Camera interaction is local-only; no camera frames are uploaded or persisted.

## Completed Stage 8 Work To Carry Forward

- Preview share generation now has media preparation retry feedback.
- Gift and preview visible Chinese text was repaired where mojibake appeared.
- BGM control labels are readable and still preserve playback behavior.
- LAN non-camera routes return 200 for the core pages.
- Uploaded-media gift data confirms audio/image URLs are public URLs, not local `data:` strings.
- Camera validation is explicitly deferred to HTTPS.

## Open TODOs

- Create/push the Stage 9 GitHub repository once repository-creation capability is available.
- Complete a manual mobile LAN flow for non-camera behavior:
  - start from homepage,
  - select system BGM,
  - edit content,
  - preview,
  - generate a share link,
  - open the generated link on the phone.
- Repeat the same manual flow with uploaded image/audio.
- Deploy to HTTPS or create a stable HTTPS tunnel.
- Validate camera permission and MediaPipe hand recognition only under HTTPS.
- Decide whether the gesture debug panel should remain available, be gated, or be removed from recipient-facing builds.
- Use `docs/18-stage-9-https-deployment-runbook.md` for the HTTPS deployment and camera-validation sequence.

## Development Rules Added From Recent Failures

### Encoding

- Never copy mojibake from terminal output into source or docs.
- Use patch-based edits for Chinese text.
- Treat PowerShell Chinese output as potentially display-garbled.
- Validate Chinese UI visually in browser and, for JSON, with Node/browser decoding.

### Camera

- Do not debug mobile camera on LAN HTTP as if it were a product bug.
- First ask: secure context, permission state, browser support, active device, then MediaPipe load.
- Preserve touch fallback throughout.

### Share Reliability

- Do not generate cross-device links while media is still local-only.
- If media preparation fails, present a retry and block final generation.
- Validate with a different browser/device, not only the creator tab.

### Scope Control

- One stage or one clear module per turn.
- Update logs and validation links every turn.
- Avoid unrelated refactors while stabilizing deployment.

## Stage 9 Acceptance Draft

Stage 9 baseline is acceptable when:

- The project builds with `npm.cmd run build`.
- Core routes return 200 locally.
- Core routes return 200 on LAN for non-camera flow.
- Existing validated gift IDs still open.
- Uploaded-media gift still exposes public media URLs.
- The Stage 9 repository exists on GitHub and contains the same tracked snapshot.
- The next session can start from `docs/11-session-handoff.md` and this file without needing the prior conversation.
