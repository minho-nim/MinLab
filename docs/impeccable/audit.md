# MinLab UI audit and refinement

Scope: existing Home, About and project showcase. Refine the charcoal/sage visual system; preserve real copy, project data, records and interactions. This is a scoped code/render review, not a WCAG conformance certification.

## Implementation integrity

The existing system is coherent: Pretendard, semantic sage tokens, real product screenshots, native URL/history and separate local editing drafts. Preserve it. The Impeccable source detector returned no findings for the changed stylesheet; that alone does not establish visual quality.

## Audit health score (scoped, before fixes)

| Dimension | Score / 4 | Evidence |
|---|---:|---|
| Accessibility | 2 | Inactive scene/About text is dimmed below 4.5:1 |
| Performance | 2 | Main JS 1,072.75 kB minified / 270.21 kB gzip; Vite chunk warning |
| Theming | 3 | Shared tokens; some legacy literal borders remain |
| Responsive | 3 | Existing mobile layouts; one real thumbnail name splits awkwardly |
| Implementation integrity | 3 | Coherent existing system, isolated readability defects |
| Total | 13 / 20 | Scoped baseline, not a site-wide certification |

## Findings

- **P1 Accessibility — inactive text contrast.** `src/experience.css`, `.scene-stories article` and `.about-timeline article`: parent opacity .55/.65 dims `#a0afa4` text over `#121715` to approximately 3.26:1/4.05:1. This falls below WCAG 1.4.3 for ordinary text. Fixed: keep content fully opaque; indicate current scene with a sage top border and current journey stage with the timeline marker. Resulting muted-text ratio: 7.91:1. Suggested command: `impeccable harden`, then `impeccable polish`.
- **P2 Performance — main bundle warning.** Build emits the existing >500 kB chunk warning. No performance timing was measured; do not equate bundle size with a measured latency failure. Deferred: investigate lazy loading editor/document utilities in a separate functional change. Suggested command: `impeccable optimize`.
- **P3 Responsive — mobile thumbnail name.** At 390 px, the real `MINOVA(미노바)` label wrapped inside a 78 px text area and became two lines while peers were one. Fixed: 112 px thumbnail controls (102 px label area), keep Korean words together, retain horizontal scrolling and full accessible names. Suggested command: `impeccable adapt`, then `impeccable polish`.

## Verification and limits

Chromium Linux, emulated desktop/mobile viewports and existing synthesized-touch regression coverage. Physical iOS/Android hardware and Safari are untested. Preserve the existing keyboard, reduced-motion, empty/error, backup, draft and history behavior. No project/development-log data is edited by this pass.

Report storage: this pinned upstream launcher returned `Unknown command: audit-storage`; the report is retained here instead.

Source detector: `impeccable detect --json src/experience.css` returned `[]` after edits. Test/build evidence is summarized in the PR. Full schedule dependency installation remains subject to the existing SheetJS CDN restriction in this workspace; CI retains the full project checks.

## Recommended actions

1. `impeccable optimize`: investigate the existing main bundle warning separately.
2. `impeccable polish`: verify any future optimization preserves the same visual and interaction system.

Installation: project-local, pinned upstream with license/provenance in `.agents/skills/impeccable/UPSTREAM.md`. No Live server, hooks, agent registrations or app runtime dependencies enabled. UI UX Pro Max and agent-browser were reviewed but are not installed.
