# Stage 8 Handoff

Updated: 2026-06-26

## Current Position

BloomBeat has entered Stage 8: cloud sharing and publishing stabilization.

The product now supports a local creation flow and a cloud-backed share flow:

- `/create/song`: choose system BGM, link/mock recommendation, or upload local audio.
- `/create/content`: edit recipient, blessing, background image, theme, blessing color, barrage settings.
- `/create/preview`: final preview and publishing page.
- `/gift/[id]`: cloud gift page for recipients.
- `/gift/share#bloombeat=...`: self-contained fallback share route.
- `/gift/demo`: local draft/demo route for development validation.

## Key Product Decisions

- `/create/preview` is the final preview and publish page. There is no separate required "gift effect" step for creators.
- The bottom primary flow on `/create/preview` is `返回编辑 + 完成并分享`.
- The right-side creator control on preview is the blessing barrage toggle, not a forward/share shortcut.
- Gift naming happens in the share popover. Default title is `给XX的礼物`, where `XX` comes from the recipient nickname.
- Users can edit the gift name before generating the share link. Editing the name updates the gift card title and clears old generated links.
- Share should prefer cloud `/gift/[id]`. Hash fallback remains available when cloud save fails, but it cannot carry uploaded audio or data URL images across devices.
- User-uploaded audio should always override system BGM. When `audioUrl` exists, `SynthBgmButton` plays it first.
- First entry into the gift experience should show gesture/touch guidance and camera launch. Users can close it with `我知道了`; the `?` guide and `启动摄像头` controls remain available.
- Camera video is never stored, uploaded, or written into gift data. It is only used locally for real-time gesture recognition.

## Completed In Stage 8

- Supabase environment variables were configured locally in `.env.local`.
- Supabase Storage bucket `bloombeat-gifts` was created and verified.
- Supabase `gifts` table was created by the user and verified through the app API.
- `/api/upload` accepts images up to 8MB and audio up to 10MB.
- `/api/gifts` saves gifts with upsert and creates valid cloud ids that start with `gift-`.
- Fixed a cloud id bug where local draft id `__draft__` could become a cloud gift id.
- `GiftDraft` now reserves future extension fields:
  - `backgroundPresetId`
  - `weatherPreset`
  - `scenePreset`
- `giftCodec` preserves these future fields for hash fallback compatibility.
- Uploaded audio now writes to both lightweight local draft and IndexedDB draft from all music selection paths.
- Preview merge logic restores uploaded audio from IndexedDB when localStorage has stripped `audioUrl`.
- Gesture/touch guide is restored for first entry on creator preview and recipient gift pages.
- Dev logs for 2026-06-26 include Stage 8 implementation and validation notes.

## Important File Changes

- `src/app/api/upload/route.ts`
  - Validates image/audio type and size.
  - Uploads data URLs to Supabase Storage and returns public URLs.

- `src/app/api/gifts/route.ts`
  - Saves cloud gifts.
  - Uses valid `gift-...` ids only.
  - Allows empty recipient names.
  - Uses upsert to avoid duplicate id failures.

- `src/lib/cloudGiftStore.ts`
  - Frontend entry for cloud save/read.
  - Uploads local data URL resources before saving gift JSON.

- `src/lib/gift.ts`
  - Main `GiftDraft` type and defaults.
  - Added future extension fields.

- `src/lib/giftCodec.ts`
  - Hash share encode/decode sanitizer.
  - Preserves future extension fields.

- `src/app/create/song/page.tsx`
  - Music source selection.
  - Uploaded audio now persists to IndexedDB via `saveLocalDraft`.

- `src/app/create/preview/page.tsx`
  - Final preview/publishing page.
  - Merges IndexedDB and localStorage drafts.
  - Restores uploaded audio source metadata when localStorage loses `audioUrl`.

- `src/components/GiftExperience.tsx`
  - Shared creator/recipient gift experience.
  - First entry shows gesture/touch guide and camera launch.
  - Uses touch fallback when camera is unavailable.

- `docs/14-stage-8-cloud-sharing.md`
  - Supabase setup and Stage 8 acceptance notes.

- `dev-logs/2026-06-26.md`
  - Full implementation and validation history for this stage.

## Architecture Summary

```txt
User edits gift
  -> GiftDraft
  -> saveDraft(localStorage lightweight/current fields)
  -> saveLocalDraft(IndexedDB full draft with uploaded resources)

/create/preview
  -> getLocalDraft()
  -> getDraft()
  -> merge full uploaded resources from IndexedDB with latest lightweight fields
  -> GiftExperience preview
  -> share popover edits title
  -> saveCloudGift()

saveCloudGift()
  -> upload data URL audio/image through /api/upload
  -> save final gift JSON through /api/gifts
  -> return stable /gift/[id]

/gift/[id]
  -> getCloudGift(id)
  -> render read-only GiftExperience
  -> if camera works: gesture mode
  -> if camera fails: touch fallback
```

## Current Validation Links

Local server:

```txt
http://127.0.0.1:3000/create/song
http://127.0.0.1:3000/create/content
http://127.0.0.1:3000/create/preview
http://127.0.0.1:3000/gift/demo
```

Known cloud validation example from this session:

```txt
http://127.0.0.1:3000/gift/gift-mquyi5v0-b446af71
```

## Stage 8 Acceptance Checklist

- Create a gift with uploaded audio.
- Confirm `/create/preview` plays uploaded audio after tapping `音量`.
- Generate a share link.
- Confirm generated link is `/gift/gift-...`, not `/gift/share#bloombeat=...`.
- Open the link in another browser or device.
- Confirm gift title, blessing, theme, barrage switch, uploaded audio, and uploaded background match.
- Confirm first gift entry shows gesture/touch guide and camera launch.
- Confirm closing the guide reveals the gift and touch interaction still works.
- Confirm cloud save failure still provides clear fallback messaging.

## Remaining Work

- Do a full real-device Stage 8 pass with both uploaded image and uploaded audio.
- Validate generated `/gift/[id]` links in WeChat, iPhone Safari, Android Chrome, and desktop Chrome.
- Deploy to Vercel with HTTPS and Supabase environment variables.
- Re-test camera permissions on HTTPS mobile browsers.
- Start Stage 8.5 visual system and motion polish only after Stage 8 sharing is stable.
- Stage 9 music API/recommendation search remains future work; keep upload and system BGM as fallback.

## Suggested Next Step

Recommended next stage: deploy a real HTTPS preview to Vercel and run a cross-device Stage 8 acceptance pass.

Expected effect:

- The product can be shared with real recipients through a stable HTTPS link.
- Uploaded audio/background resources can be validated outside the creator's browser.
- Camera permission behavior can be tested under a secure context.
- Remaining issues will be concrete device/browser compatibility bugs rather than local-environment uncertainty.
