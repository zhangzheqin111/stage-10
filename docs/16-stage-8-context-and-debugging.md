# Stage 8 Context and Debugging Playbook

Updated: 2026-06-27

## 1. Current Project State

BloomBeat is currently in Stage 8: cloud sharing, mobile validation, and creation-to-recipient flow stabilization.

Current primary routes:

```txt
/create/song       Music selection and upload
/create/content    Recipient, blessing, image, theme, visual settings
/create/preview    Final interactive preview and share generation
/gift/[id]         Recipient gift page
```

Current local validation entry:

```txt
http://127.0.0.1:3001/create/song
```

Temporary Cloudflare tunnel URLs can expire or return 530. When mobile validation is needed, restart the local production server and tunnel, then verify the tunnel root and `/gift/[id]` before asking the user to test.

## 2. Key Decisions

- Do not skip stages. Stage 8 work is limited to sharing, upload persistence, mobile preview/gift flow, and interaction readiness.
- `/create/preview` is the final creator preview and publish page. The creator should not be sent directly into the recipient-only gift flow before share generation.
- The guide page CTA is `查看礼物生成`; `完成并分享` appears only after entering the formal interaction preview.
- Gesture tutorial and touch tutorial are separate. Switching tutorial text must not silently change the actual interaction mode unless the user explicitly chooses touch fallback.
- The camera/hand-recognition feature is a core product highlight. Do not remove it as a shortcut for performance; improve loading, permission guidance, and fallback clarity instead.
- Raw gesture debug/tuning UI must not be visible to creators or recipients. If tuning is needed later, expose simple human-facing controls only after product confirmation.
- Music pause is temporary and must resume from the previous playback position.
- Closing BGM is different from deleting BGM.
- Deleting music in creation means recipient gift pages should have no BGM control.
- Default system BGM should still show the music control unless the user explicitly removed music.
- Link generation must not wait on remote database latency during local/tunnel validation. Save gift JSON locally first, then run Supabase save in the background when configured.
- Uploaded image/audio must be prepared before final share generation. Link generation should save small gift JSON, not upload large data URLs at the last moment.

## 3. Completed Stage 8 Work

- Uploaded audio and image persistence through localStorage plus IndexedDB draft recovery.
- Background image preparation from `/create/content`.
- Music preparation from `/create/song` with clear large-audio warnings.
- Shared media preparation registry in `src/lib/mediaPreparation.ts` so the same data URL is not uploaded repeatedly in one tab.
- Preview-page media readiness status and final generation gate when resources are still local data URLs.
- Fast local gift JSON save through `.data/cloud-gifts.json` for local/tunnel validation.
- `/api/gifts/[id]` reads local saved gifts first and falls back to Supabase.
- Share panel supports editable gift name before link generation.
- Gift page supports editing the forwarded gift name.
- Native share button label changed to `分享至`; Web Share is used when supported, copy fallback is used otherwise.
- Guide and interaction page mobile layout improved, with guide-only scroll and small-screen interaction compression.
- Gesture guide now includes upward/downward hand movement, left/right wave, fist, and thumb-index pinch.
- Touch tutorial has its own button and tutorial content.
- Music popover supports volume, pause/resume, close BGM, and restore BGM.
- User-facing gesture debug/tuning panel removed from creator and recipient gift pages.
- Frontend Chinese text was repaired in key app files after mojibake caused broken UI and parse errors.

## 4. Important Modified Files

```txt
src/app/create/song/page.tsx
src/app/create/content/page.tsx
src/app/create/preview/page.tsx
src/app/gift/[id]/page.tsx
src/app/api/gifts/route.ts
src/app/api/gifts/[id]/route.ts
src/app/api/upload/route.ts
src/components/GiftExperience.tsx
src/components/SynthBgmButton.tsx
src/lib/cloudGiftStore.ts
src/lib/mediaPreparation.ts
src/lib/serverGiftStore.ts
src/lib/gift.ts
src/app/globals.css
public/theme-backgrounds/
stage8-validation-assets/
```

## 5. Current Architecture

```txt
Creator selects music
  -> save lightweight draft
  -> save full draft with uploaded audio in IndexedDB
  -> start background media preparation

Creator edits content/image
  -> save lightweight fields
  -> save full draft with uploaded image in IndexedDB
  -> start background media preparation

Creator previews gift
  -> merge localStorage draft and IndexedDB resources
  -> rescue missing prepared resources if needed
  -> show interactive preview
  -> share panel edits gift name
  -> final generate only when data URL resources are prepared

Generate share link
  -> save gift JSON locally first through /api/gifts
  -> return /gift/[id] quickly
  -> attempt Supabase save in background if configured

Recipient opens /gift/[id]
  -> read local gift store first
  -> fallback to Supabase
  -> render GiftExperience
  -> show gesture guide, camera launch, and touch fallback
```

## 6. Common Failure Causes and Development Rules

### Slow Link Generation

Common causes:

- Uploading large audio/image data URLs during the final generate click.
- Waiting for Supabase database latency before returning a link.
- Re-uploading the same resource repeatedly after route changes.

Rules:

- Media preparation should start before final generation, preferably when the user uploads media or enters preview.
- Final generation should only save compact gift JSON.
- Local/tunnel validation should return after local JSON save; Supabase sync can run in the background.
- Add visible progress feedback only where the wait is real. Do not spread a fake equal-duration progress bar across all steps.
- Measure `/api/gifts` and `/api/upload` separately before changing UX copy.

### Uploaded Music or Images Not Recognized

Common causes:

- Mobile browsers may provide incomplete MIME types.
- localStorage may strip or overwrite large `audioUrl` / `backgroundImageUrl` fields.
- Route changes can write a lightweight draft over the full IndexedDB draft.
- A local data URL can survive in the draft and fail on another device.

Rules:

- Store large uploaded resources in IndexedDB and keep lightweight metadata in localStorage.
- When loading preview, merge IndexedDB resources back into the current draft.
- Prefer already prepared cloud/public URLs over stale data URLs.
- Do not rely only on the file input state; the draft must contain enough information after refresh or route changes.
- Before accepting a generated link, open `/api/gifts/[id]` or `/gift/[id]` and confirm uploaded audio/image URLs are present when applicable.

### Cannot Enter Interaction Page or Camera Flow

Common causes:

- Testing mobile through `next dev` and Cloudflare tunnel can break HMR/websocket behavior.
- Tunnel may expire or return 530.
- Camera requires secure context and explicit user gesture.
- Guide state can incorrectly show gesture tutorial after permission denial.

Rules:

- For mobile tunnel validation, use production mode: `npm.cmd run build` then `next start -p 3001`.
- Verify the tunnel root and target gift link before sending links to the user.
- Camera must only start after a user action.
- If camera permission is denied or unavailable, show touch tutorial and a clear retry camera action.
- Do not remove hand recognition as a workaround; preserve it and improve readiness feedback.

### Share Link Generated But Missing Uploaded BGM or Image

Common causes:

- Fallback hash links cannot reliably carry uploaded media across devices.
- The user generated before media preparation finished.
- Local data URLs were saved instead of public URLs.

Rules:

- Uploaded media must become public/server-readable URLs before cross-device sharing.
- If a gift still contains data URL media at generation time, block generation with clear user copy.
- Generated share links should be `/gift/gift-...` for real validation, not `/gift/share#...`.
- Test the generated link in a different browser/device when validating share reliability.

### Frontend Chinese Text Becomes Mojibake

Common causes:

- Writing Chinese files through commands that do not preserve UTF-8.
- Copying already-garbled text from terminal output.
- Editing JSX strings after mojibake can create syntax-breaking quotes or unterminated strings.

Rules:

- Prefer `apply_patch` for Chinese UI text edits.
- Do not use PowerShell `Set-Content` or ad hoc shell writes for Chinese UI copy unless encoding is explicitly controlled and verified.
- Search for suspicious mojibake before finishing:

```powershell
rg "�|鍚|绀|闊|璋|鈾|俙|鎾|瑙|鐢" src docs README.md
```

- Run `npm.cmd run build` after repairing UI text because mojibake often breaks JSX strings.

### Debug UI Leaks Into User Flow

Common causes:

- Internal tuning components rendered unconditionally inside `GiftExperience`.
- Debug panels designed for development but tested by real users.

Rules:

- Debug panels must be behind an explicit development flag or removed from user-facing routes.
- User-facing controls must use understandable labels, not raw thresholds or model parameters.
- If a tuning panel is proposed for recipients, confirm product design before implementation.

## 7. Acceptance Checklist For Next Session

Validate one module at a time:

1. `/create/song`
   - Upload audio under 5MB.
   - Upload audio above 6MB and confirm the prominent choice: continue using original audio or replace audio.
   - Confirm selected system BGM can be selected, removed, and restored only when intended.

2. `/create/content`
   - Upload image and confirm it enters preview immediately.
   - Select theme templates and confirm visual changes persist.

3. `/create/preview`
   - Confirm music control is visible when BGM exists.
   - Confirm guide page fits small screens and the bottom action is reachable.
   - Confirm touch tutorial switch shows touch-specific instructions.
   - Confirm final link generation is fast after resources are prepared.

4. `/gift/[id]`
   - Open generated link in another browser/device.
   - Confirm gift name, uploaded image, uploaded audio, blessing, theme, guide, camera launch, and touch fallback.
   - Confirm gift name can be edited for secondary forwarding.

## 8. Known Risks and TODOs

- The current fast local save is appropriate for local/tunnel validation. A stable production deployment still needs Supabase/Vercel validation.
- Audio upload/preparation can still be slow for large files. The next performance module should focus on audio preparation strategy without changing current interaction design.
- Camera readiness is still dependent on browser, permission state, HTTPS, and MediaPipe load time. Improve perceived readiness and caching without removing hand recognition.
- Some historical docs still contain mojibake from earlier sessions. Use this document as the clean Stage 8 source of truth.

## 9. Recommended Next Step

Next module: Stage 8 production-stability pass.

Expected effect:

- Link generation should feel fast in normal use because heavy resource preparation is already done before final generation.
- Generated `/gift/[id]` links should preserve uploaded audio and image across browsers/devices.
- Mobile users should understand gesture and touch modes without getting stuck on the guide page.
- Camera startup issues should become diagnosable permission/loading states instead of a dead-end experience.
