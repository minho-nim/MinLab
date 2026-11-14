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

Source: `minho-nim/Valumin` at `822c28b422867aa0f08ed3d05f0a2a4c4c354950`, captured 2026-11-14. This is the actual production build of [Valumin PR #9](https://github.com/minho-nim/Valumin/pull/9), not a claim that the production deployment has already changed.

`valumin-overview.webp`, `valumin-register.webp`, `valumin-usage.webp`, `valumin-detail.webp` show the source app at `/worthit/?mode=demo`, using its built-in sample data. The actual app now renders Valumin in this reviewed source. PNG screenshots at 1200×1000 were encoded as WebP without painting or replacing text. The captures verify opening the registration form, adding a sample use and viewing item details; they do not prove submitting a new item or every calculation boundary.

Separate checks used an actual backup exported by the prior app at `d4b36093bb3d23f13d5b796e55ada70d055606b1`. Import, restore, export and reload preserved its item/usage/billing arrays. Demo actions left personal storage unchanged. Actual PNG and PDF receipt downloads used Valumin filenames, and the PDF Creator was Valumin. Header/title/install guide/manifest, empty data and invalid backup states were checked at 400/1400px. Real installed iOS/Android name refresh, offline reentry and OS clipboard/sharing were not tested. Legacy storage keys, PWA identity, `/worthit/` URL and JSON version remain unchanged.

| File                  | SHA-256                                                          |
| --------------------- | ---------------------------------------------------------------- |
| valumin-overview.webp | 474325d252072e4623ad6c5b76f82ad5f76aeaf3eedc74ffb5d5fcbd487ff248 |
| valumin-register.webp | c9a18027b10544fd8461769a22a9d3418c5beaae5b6695d6de670507c02d37fe |
| valumin-usage.webp    | 91248282ce0d43492e18e36dfc7027a9465314adbac199dd21a0bd22beedc89c |
| valumin-detail.webp   | 1677ec3f1ac030b9759301cac5661bb16d430c902afed6c7186d775127b3fb73 |

## Existing Minoffia and Minially captures

See `portfolio-sources.md`. They are examples supplied by the source portfolios. Current README / FLOW / STATUS documents were compared with those examples; cloud execution, live accounts and multi-device sync were not retested as part of this change.

## Work-schedule tool

Source: this repository at `e0d1d33963362ba4e72f14183dbdaa7c19def2a0`, captured 2026-11-14 by [CI #38](https://github.com/minho-nim/MinLab/actions/runs/43600686913). The official dependency installed successfully there, although the local environment still rejects its download. `scripts/test-schedule-browser.cjs` opened the actual production build at `/MinLab/apps/work-schedule/` in Chromium at 1440×1000 and supplied synthetic Excel and DOCX files through the real file inputs. It did not inject parsed records or reconstruct the app.

- `schedule-import.jpg`: one synthetic contract and two selected Word documents, before analysis.
- `schedule-matching.jpg`: one matching contract and one unmatched contract with its explanation. These counts describe the fixture, not production accuracy.
- `schedule-document.jpg`: the real original-DOCX preview, including synthetic roles/company/names and intentionally blank phone numbers.
- `schedule-calendar.jpg`: the one matched, dated task in the calendar. The unmatched document is excluded.

The test also verified no document-upload requests. Company-system import, real company templates, original-app mobile usability and the Excel export UI were not exercised by this browser test. Existing export unit tests remain separate. No private company documents or accounts were used. These JPEGs are unchanged browser captures, not edited or painted screenshots.

| File                  | SHA-256                                                          |
| --------------------- | ---------------------------------------------------------------- |
| schedule-import.jpg   | c0a0a5fd42adcc2717ba0bf014ee4f20ecbda86510d67d89ebd441f05290095c |
| schedule-matching.jpg | c3352fbe3b57c343cdc753d5839e47de8404fb26d49058117ae8e2d3b79142cb |
| schedule-document.jpg | 6d22be85083c0c4d920fcec98ff547187c913837f388134f22f0c4838050b45d |
| schedule-calendar.jpg | 036072baf4a8f8deae31fddfafa19a552bdc68a73c5d8fff32e31761e877fc58 |
