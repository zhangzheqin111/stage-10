# Stage 8 Handoff

Latest continuation context: read `docs/16-stage-8-context-and-debugging.md` first for the 2026-06-27 Stage 8 source of truth, common failure playbook, acceptance checklist, and next-step recommendation.

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
- API-level Stage 8 validation with generated image and WAV audio passed: `/api/upload` stored both resources in Supabase Storage, `/api/gifts` saved the gift, `/api/gifts/[id]` read it back, and `/gift/[id]` returned 200.
- Browser render validation for `gift-mqv2cxp0-1f4166bd` passed: the gift page left loading state, rendered the title/blessing/theme, showed the first-entry guide, showed music/share controls, and used the Supabase image URL in the background style.
- Added local UI validation assets in `stage8-validation-assets/` for the next manual browser upload pass:
  - `stage8-ui-audio.wav`
  - `stage8-ui-background.png`
  - `README.md` with validation steps and next-step criteria.
- After user reported that uploaded image was not visibly entering the preview/background, the validation PNG was regenerated as a larger visible test image with `BloomBeat / Stage 8 UI background` text. The user's generated cloud gift `gift-mqv3reol-bd4160d6` already contains a Supabase `backgroundImageUrl`, so the first retry should use the regenerated image to distinguish real UI failure from an invisible/invalid validation asset.
- User confirmed the regenerated image displays. New validation link `gift-mqv4mbwa-014402fb` contains a Supabase `backgroundImageUrl` and returns 200.
- `gift-mqv4mbwa-014402fb` exposed a separate audio issue: `songSourceType` is `upload`, but cloud JSON was missing `audioUrl`. Root cause: `/create/content` loaded only localStorage; when localStorage stripped large `audioUrl`, content edits overwrote the full IndexedDB draft. Fix: content page now merges IndexedDB large resources back into draft on load.
- Audio persistence fix validated with `gift-mqv7kqc8-10a79722`: cloud JSON contains Supabase `audioUrl` and `backgroundImageUrl`; audio object returns 200 as `audio/mpeg` and image object returns 200 as `image/jpeg`.
- Temporary Cloudflare HTTPS tunnel started for mobile validation:
  `https://muslim-wheel-comparison-passenger.trycloudflare.com`
- HTTPS gift validation link:
  `https://muslim-wheel-comparison-passenger.trycloudflare.com/gift/gift-mqv7kqc8-10a79722`
- Both HTTPS root and HTTPS gift URL returned 200 locally.
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
http://127.0.0.1:3000/gift/gift-mqv2cxp0-1f4166bd
http://127.0.0.1:3000/gift/gift-mqv3reol-bd4160d6
http://127.0.0.1:3000/gift/gift-mqv4mbwa-014402fb
http://127.0.0.1:3000/gift/gift-mqv7kqc8-10a79722
```

The second link is the API-level image + audio validation gift. It stores:

```txt
image/mqv2cvz2-c028fcd5-18ae-45b1-b0f6-f3884de15587.png
audio/mqv2cxfc-a5131dfa-1db2-4e40-9a16-a9f923d36866.wav
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
- Do a browser UI pass from `/create/song` through `/create/preview` using `stage8-validation-assets/stage8-ui-audio.wav` and `stage8-validation-assets/stage8-ui-background.png`; API-level resource persistence is already verified.
- For the image pass, the content-page preview should visibly show the regenerated pink/green background with `BloomBeat / Stage 8 UI background` text immediately after upload.
- After the content-page draft merge fix, `/gift/gift-mqv7kqc8-10a79722` verifies that `/api/gifts/[id]` contains a Supabase `audioUrl`; next validation should move to another browser/mobile device rather than more local API checks.
- Audio URL is played through `new Audio(audioUrl)` in `SynthBgmButton`; it is not mounted as a DOM `<audio>` element, so DOM inspection will not show the Supabase audio URL even when the upload-backed music path is active.
- The first Cloudflare quick tunnel `https://muslim-wheel-comparison-passenger.trycloudflare.com` pointed at `next dev` and should no longer be used for acceptance. Its log showed repeated `/_next/webpack-hmr` websocket failures with `malformed HTTP response "Unauthorized"`, which matches mobile pages stalling in loading/interaction states.
- Current production-mode temporary HTTPS validation URL:
  `https://rugby-yen-incidents-verified.trycloudflare.com`
- Current production-mode temporary gift validation URL:
  `https://rugby-yen-incidents-verified.trycloudflare.com/gift/gift-mqv7kqc8-10a79722`
- The production tunnel has been verified for `/`, `/gift/gift-mqv7kqc8-10a79722`, and `/api/gifts/gift-mqv7kqc8-10a79722`; the gift page HTML no longer contains a `webpack-hmr` marker.
- Missing default theme background assets were added under `public/theme-backgrounds/`: `sakura.jpg`, `morning.jpg`, `cream.jpg`, and `blue.jpg`. All four now return `200 image/jpeg` through the production tunnel.
- Mobile guide layout follow-up: `.gift-stage.guide-open`, `.guide-overlay`, and `.guide-card` now allow vertical scrolling while the guide is open, so small mobile screens should be able to reach the bottom action buttons.
- Music control follow-up: uploaded audio pause no longer resets `currentTime`; tapping the music control again resumes from the previous pause position. System BGM uses `AudioContext.suspend()` / `resume()` for temporary pause.
- Music deletion follow-up: `/create/song` now exposes a `删除音乐` action in the current selection block. It clears `audioUrl` and `bgmPresetId`, sets `musicSelected` to false, and generated gift pages do not render `SynthBgmButton` when no music is selected.
- Confirmed interaction refinement follow-up:
  - The guide completion CTA is now `查看礼物生成`.
  - Creator share/footer controls and recipient share action are hidden while the guide is open; `完成并分享` appears after entering the real interaction page.
  - The guide overlay remains center-scrollable; the real gift interaction page remains non-scrolling and uses small-height responsive compression.
  - The music control popover now supports volume, pause/resume, temporary close BGM, restore BGM, and collapse.
  - Link generation now reports progress through audio upload, image upload, and cloud save stages. Pre-upload is still a later performance module.
- Bottom-control overlap follow-up:
  - The garden/music-box visual was moved upward with larger bottom padding so bottom music/share controls no longer cover the card content.
  - Small-height rules keep the flower/card as the primary visual while reserving control clearance.
- System share follow-up:
  - Native system share is implemented with `navigator.share`.
  - `/create/preview` previously copied the link when `navigator.share` was unavailable, making `系统分享` look identical to `复制链接`.
  - It now reports unsupported/canceled native share explicitly instead of silently copying.
  - The creator preview button label is now `分享至`.
  - If native Web Share is unsupported/canceled/refused, the app copies the link as the default fallback and shows `当前系统暂不支持该功能，链接已复制，可直接粘贴分享。`
- Guide CTA layout trial:
  - The guide card now uses a scrollable `.guide-scroll` content area and a fixed `.guide-actions` action area inside the card.
  - This is guide-only; the formal flower interaction page remains non-scrolling.
- Gesture debug/tuning panel is still pending product decision. Current recommendation: remove it from recipient-facing gift pages; if a user-facing control is needed later, replace raw debug parameters with simple labels such as `手势灵敏度：低 / 中 / 高` and `动作提示：开 / 关`.
- Validate generated `/gift/[id]` links in WeChat, iPhone Safari, Android Chrome, and desktop Chrome.
- Validate the current production-mode trycloudflare HTTPS gift link in WeChat, iPhone Safari, Android Chrome, and desktop Chrome.
- Deploy to Vercel with HTTPS and Supabase environment variables after temporary tunnel validation is stable.
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
