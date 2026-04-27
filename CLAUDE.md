# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                          # install deps
npx playwright install chromium      # install browser (required once)
npm start                            # run download script (needs env vars)
npm run login                        # same as start with login subcommand
```

Run download manually with credentials:
```bash
NOMINA_USERNAME=xxx NOMINA_PASSWORD=yyy node src/presentation/cli/descargar.js
```

## Architecture

Two parallel tracks exist in this repo:

**1. Automation backend (`src/`)** — Node.js/Playwright script that logs into the PSP portal (`https://srvpsp.policia.gov.co:8443`) and downloads two payroll PDFs per run.

- `src/presentation/cli/descargar.js` — main entry point; does login + downloads 5 PDFs via `frm_rpt_nomina.aspx?v_p={1|2}`. Requires `NOMINA_USERNAME` and `NOMINA_PASSWORD` env vars — fails fast if missing.
- `src/shared/config/index.js` — single source of truth for `baseUrl`, `loginUrl`, selectors, timeout, headless flag.
- `src/infrastructure/browser/PlaywrightBrowser.js` — thin wrapper around Playwright chromium.
- `src/infrastructure/browser/PlaywrightSessionRepository.ts` — TypeScript domain-layer implementation (DDD skeleton, not used by the main script; `descargar.js` uses Playwright directly).

**2. GitHub Pages PWA (`docs/`)** — static password-protected page that lets users download the latest PDFs from a mobile browser.

- `docs/index.html` — password gate using a JS hash check (djb2-style). Correct password reveals download links.
- `docs/downloads/` — PDFs committed here by the CI workflow after each run.
- `docs/sw.js` + `docs/manifest.json` — service worker and manifest for PWA install.

## CI Workflow

`.github/workflows/descargar-nomina.yml` runs every Monday at 09:00 UTC (and on manual dispatch). It downloads PDFs to `output/`, copies them to `downloads/`, then commits and pushes. Requires `NOMINA_USERNAME` and `NOMINA_PASSWORD` repository secrets.

## Key Notes

- The `.ts` files in `src/` are a DDD refactor skeleton — they are not compiled or used in production. The active script is the plain JS `descargar.js`.
- PDF filenames follow `nomina{1|2}-{mes}-{año}.pdf` pattern, derived from the dropdown text on the portal.
- The `docs/index.html` password hash (`_0x4a`) is obfuscated but is a djb2 hash of the real password — changing the password means recomputing this hash and updating that variable.
