# Coding Agent Rules

1. Project name must remain BloomBeat.
2. Before development, read the relevant docs, especially:
   - `README.md`
   - `docs/00-project-overview.md`
   - `docs/01-prd.md`
   - `docs/07-development-roadmap.md`
   - `docs/08-acceptance-checklist.md`
   - `docs/10-coding-agent-rules.md`
   - `docs/11-session-handoff.md`
   - the newest stage context document.
3. Follow the roadmap order. Do not skip stages.
4. Each turn may develop only one stage or one clearly bounded module.
5. Validate completed work against `docs/08-acceptance-checklist.md`.
6. Update `dev-logs/YYYY-MM-DD.md` after every development or documentation turn.
7. If the daily log does not exist, create it.
8. The log must include what changed, what was validated, risks/blockers, and the next step.
9. Do not break the existing main flow in order to add a complex feature.
10. High-risk features must keep fallbacks:
    - music API failure -> mock music or system BGM,
    - camera failure -> touch mode,
    - upload failure -> clear retry/replace path,
    - cloud save failure -> clear message and no misleading cross-device link.
11. Do not attempt to implement all remaining stages at once.
12. Every user-facing response must include:
    - complete validation links,
    - what the user should validate,
    - what the next step will be.

## Encoding And Chinese Text Rules

- Use `apply_patch` for Chinese UI/docs edits.
- Do not write Chinese text through ad hoc PowerShell file-writing commands unless encoding is explicitly controlled and verified.
- Do not copy garbled terminal output into source files.
- PowerShell can display Chinese API responses as mojibake; use Node/browser decoding for JSON validation.
- Before finishing UI text work, run a focused scan for known mojibake fragments in `src/app`, `src/components`, and `src/lib`.
- Run `npm.cmd run build` after repairing JSX or TSX text.

## Camera Rules

- Mobile camera access requires HTTPS or another secure context.
- LAN HTTP links are valid for non-camera validation but not for final mobile camera validation.
- Do not spend repeated debugging cycles on mobile `getUserMedia` failures over LAN HTTP.
- Keep touch fallback usable and visible on all gift/preview flows.
- Camera frames must remain local-only and must not be uploaded, persisted, or written into gift data.

## Share-Link Rules

- Cross-device gifts should use saved `/gift/[id]` links.
- Do not rely on hash fallback links for uploaded audio/image cross-device sharing.
- Do not generate final share links while uploaded media is still a local `data:` URL.
- If media preparation fails, show an understandable retry path.

## Debug UI Rules

- Development/debug panels must be behind an explicit dev flag or intentionally accepted by product design.
- Recipient-facing UI should use product language, not internal model thresholds or tuning labels.
