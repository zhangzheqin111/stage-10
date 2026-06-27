# Stage 9 HTTPS Deployment Runbook

Updated: 2026-06-27

## Purpose

This runbook is the next Stage 9 module after the baseline snapshot. Its purpose is to move BloomBeat from local/LAN validation into a secure HTTPS environment so cross-device sharing and mobile camera behavior can be tested correctly.

## Preconditions

- The current code builds locally with `npm.cmd run build`.
- The Stage 9 snapshot is saved on GitHub, either as:
  - branch backup: `https://github.com/zhangzheqin111/BLOOMBEAT/tree/stage-9`, or
  - preferred new repository: `https://github.com/zhangzheqin111/stage-9`.
- Supabase project exists.
- Supabase Storage bucket exists:
  - `bloombeat-gifts`
- Supabase gift table/API setup from Stage 8 remains available.

## Required Environment Variables

Set these in the deployment platform:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=bloombeat-gifts
```

Rules:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may be visible to the browser.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.
- Do not commit `.env.local`.
- Uploaded media should use Supabase Storage by default for durable cross-device links.
- The local server media path is only a validation/fallback path. Enable it explicitly with both:
  - browser/build env: `NEXT_PUBLIC_BLOOMBEAT_FAST_MEDIA=1`
  - server env: `BLOOMBEAT_SERVER_MEDIA_ENABLED=1`
- Do not enable server media for formal production unless the server filesystem is persistent and intentionally used as storage.

## Suggested Vercel Flow

1. Create or select the GitHub repository/branch to deploy.
2. Import the project into Vercel.
3. Framework preset: Next.js.
4. Build command: `npm run build`.
5. Output settings: use the default Next.js settings.
6. Add the environment variables above.
7. Deploy.
8. Open the generated HTTPS URL.

## HTTPS Acceptance Links

Replace `<https-host>` with the deployed URL:

```txt
https://<https-host>/
https://<https-host>/create/song
https://<https-host>/create/content
https://<https-host>/create/preview
https://<https-host>/gift/gift-mqwgelr1-6c6f22e0
https://<https-host>/gift/gift-mqv7kqc8-10a79722
```

If the old local validation gift IDs are not present in the deployed database, create a new gift on the deployed site and use that generated `/gift/[id]` link for validation.

## Deployment Validation

Validate in this order:

1. Homepage opens on HTTPS.
2. Create flow opens:
   - `/create/song`
   - `/create/content`
   - `/create/preview`
3. System BGM gift flow:
   - select a system BGM,
   - edit recipient and blessing,
   - preview,
   - generate `/gift/[id]`,
   - open the generated link in another browser/device.
4. Uploaded media gift flow:
   - upload supported audio under 10MB,
   - upload supported image under 8MB,
   - confirm preview media appears,
   - generate `/gift/[id]`,
   - open the generated link in another browser/device,
   - confirm the gift uses public media URLs, not local `data:` URLs.
5. Share/forward flow:
   - copy link,
   - system share when available,
   - edit forwarding title,
   - generate forwarded link.

Before manual validation, run the automated smoke check against the deployment:

```powershell
$env:STAGE9_BASE_URL="https://<https-host>"
npm.cmd run validate:stage9
```

Optional uploaded-media URL reachability check:

```powershell
$env:STAGE9_BASE_URL="https://<https-host>"
$env:STAGE9_CHECK_MEDIA_HEAD="1"
npm.cmd run validate:stage9
```

## Camera Validation

Only run this section on HTTPS.

Device matrix:

- iPhone Safari
- Android Chrome
- WeChat in-app browser if available

Validate:

- The guide shows the camera start button.
- Tapping the camera button requests permission.
- If permission is granted, camera preview appears.
- MediaPipe hand recognition starts after camera preview.
- Data panel changes from touch mode to camera mode.
- Up/down hand movement changes flower height.
- Left/right movement changes wind and volume.
- Open/close hand changes bloom state.
- Pinch changes color.
- If permission is denied or camera fails, touch fallback remains usable.

Do not mark LAN HTTP camera failure as a regression.

## Common Failure Diagnosis

### Camera Does Not Start

Check:

- URL starts with `https://`.
- Browser permission is not blocked.
- Another app is not using the camera.
- Browser supports `navigator.mediaDevices.getUserMedia`.
- MediaPipe model URL can load.

### Gift Opens But Media Is Missing

Check:

- The generated link is `/gift/[id]`, not only a hash fallback.
- The gift record contains public `audioUrl` and `backgroundImageUrl`.
- Supabase Storage bucket is public or the public URL is readable.
- Upload API returned 200 during preview/share preparation.
- Upload API response should normally report `storage: "supabase"` in formal deployment.
- If the response reports `storage: "server"`, confirm this was intentionally enabled for validation/fallback.

### Upload Fails

Check:

- Audio is mp3/wav/m4a and under 10MB.
- Image is under 8MB.
- `SUPABASE_SERVICE_ROLE_KEY` exists in deployment env.
- `SUPABASE_STORAGE_BUCKET` matches the actual bucket name.

## Completion Criteria

Stage 9 HTTPS deployment validation is complete when:

- HTTPS deployment URL is available.
- `npm.cmd run validate:stage9` passes against the HTTPS deployment URL.
- A system-BGM gift can be created and opened on another device.
- An uploaded-media gift can be created and opened on another device.
- Camera behavior is validated under HTTPS or failure falls back cleanly to touch mode.
- `dev-logs/YYYY-MM-DD.md` records the deployed URL, tested devices, passed links, and remaining blockers.
