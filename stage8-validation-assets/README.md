# Stage 8 UI Validation Assets

Use these small local files to validate the real browser upload flow.

## Files

- `stage8-ui-audio.wav`: short WAV audio, about 64KB.
- `stage8-ui-background.png`: visible PNG background with `BloomBeat / Stage 8 UI background` text, about 116KB.

## How To Validate

1. Open `http://127.0.0.1:3000/`.
2. Click `开始制作`.
3. On `/create/song`, choose local upload and select `stage8-ui-audio.wav`.
4. Confirm the page shows the uploaded audio as the selected music.
5. Continue to `/create/content`.
6. Upload `stage8-ui-background.png`.
   - The preview box should visibly switch to the pink/green test image with `BloomBeat / Stage 8 UI background` text.
7. Fill recipient and blessing text, then choose any theme.
8. Continue to `/create/preview`.
9. Tap `音量`; the music panel should open and the uploaded audio should be used.
10. Click `完成并分享`, then generate the share link.
11. The link should be `/gift/gift-...`, not `/gift/share#bloombeat=...`.
12. Open that link in another browser or device.

## What To Validate

- The uploaded audio remains selected after navigating to preview.
- The uploaded background image appears in preview and gift pages.
- The preview image should be visually obvious; if you only see the default theme background, the image upload path is still failing.
- The generated share link is cloud-backed.
- The recipient gift page renders the same title, blessing, theme, uploaded background, and uploaded audio.
- First entry still shows the gesture/touch guide.
- Closing the guide reveals the gift and touch interaction remains available.

## Continue Next

After this UI upload pass succeeds, continue to cross-device/mobile validation:

- Desktop Chrome secondary browser.
- iPhone Safari.
- Android Chrome.
- WeChat in-app browser.
