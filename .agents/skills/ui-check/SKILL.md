---
name: ui-check
description: Check added frontend code with the UXKIN UI Check source scanner, then inspect the rendered UI. This is a project-local adapter for uxkin/ui-check, which is distributed as a GitHub Action.
---

# UXKIN UI Check — local adapter

Read README.md for the checks and their limitations. The original MIT-licensed source is in src/; provenance is in UPSTREAM.md.

Run from the project root after committing the proposed change:

```sh
INPUT_BASE=origin/main INPUT_PATHS='src/**/*.{tsx,ts,css}' node .agents/skills/ui-check/src/main.mjs
```

The scanner compares the base with HEAD and only reports added lines. For an uncommitted change, use the exported checkFile function with actual added-line sets instead of pretending the command scanned the working tree. Do not send source to an external service.

Inspect each finding against the actual component and visible behavior. Fix verified defects within the user-authorized scope. Do not silence findings merely to produce a green run. Follow the project's own colors, typography and interaction rules. A source scan is not a visual or accessibility audit; also inspect real rendered screenshots, keyboard focus and responsive layouts, and report the actual coverage and any unrun checks.
