# Project screen provenance

These files are direct browser screenshots of the unmodified apps. PNG captures were encoded as WebP; no UI text, metric, name or screen content was painted over. All sessions were isolated from personal browser data.

## MINOVA

Source: `minho-nim/MINOVA` at `26fb0859f01f478ebb6c932475f1bdca3c5d69ef`, inspected 2026-11-14.

- `minova-intro.webp`: world and character introduction, 1100×1000 viewport.
- `minova-choice.webp`: actual game console after the new-game briefing; direct element screenshot.
- `minova-values.webp`: actual resource bar after one right-hand decision, with a subsequent choice preview; direct element screenshot.
- `minova-history.webp`: actual decision-history panel after that decision; direct element screenshot.
- `minova-freeplay.webp`: actual game console in free play. The unmodified `scripts/simulate.ts` helper ran the real `transitionSession` engine with strategy `lowest`, seed 97, and zero extra free-play days. The resulting legitimate save was resumed through the UI. This is an automated example path, not a claim of manually playing or validating every branch.

The captures show the app, not a reconstructed MinLab mockup. The introductory full screen and focused feature captures intentionally serve different purposes. Character artwork remains part of the original app. ACT III is not implemented or depicted.

## Valumin

Source: `minho-nim/Valumin` at `d4b36093bb3d23f13d5b796e55ada70d055606b1`, inspected 2026-11-14.

`valumin-overview.webp`, `valumin-register.webp`, `valumin-usage.webp`, `valumin-detail.webp` show the source app at `/worthit/?mode=demo`, using its built-in sample data. The source still renders **WorthIt** in the header and other areas. That historical name was not removed from the screenshots. MinLab calls the project **Valumin** and labels the discrepancy. Original-repository changes are required to rename the actual app UI. The captures verify opening the registration form, adding a sample use and viewing an item's details; they do not prove submission of a new item or all calculation boundaries.

## Existing Minoffia and Minially captures

See `portfolio-sources.md`. They are examples supplied by the source portfolios. Current README / FLOW / STATUS documents were compared with those examples; cloud execution, live accounts and multi-device sync were not retested as part of this change.

## Work-schedule tool

No fabricated replacement screenshot was supplied. The current local environment denied the official SheetJS 0.20.3 download with HTTP 403. Code and prior records were inspected, but a new end-to-end Excel/DOCX browser capture was not produced. No private company files were used.
