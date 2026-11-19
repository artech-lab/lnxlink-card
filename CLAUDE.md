# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: LNXlink Card

Home Assistant dashboard card (Lovelace custom card) for Linux computers monitored with
[LNXlink](https://github.com/bkbilly/lnxlink) over MQTT. It is distributed through HACS (category `plugin`,
shown as "Dashboard"; from Home Assistant 2026.11 HACS is built in as the Marketplace).

Answer the maintainer in the language they write in. Code, comments, commit messages and the English
README stay in English.

## Commands

```bash
npm run check        # syntax check of the card
npm test             # unit tests (node:test, no dependencies, Node 20+); CI runs them with TZ=UTC
node --test --test-name-pattern="discovery" tests/card.test.mjs   # a single unit test, by name
npm install && npx playwright install chromium   # once, for the two commands below
npm run test:e2e     # browser tests with a simulated Home Assistant (a few seconds)
npm run screenshots  # regenerates images/preview.png and images/light-it.png with demo data
```

`CHROME_PATH=/path/to/chrome` makes the two Playwright commands use an installed browser instead of the one
downloaded by `npx playwright install`.

The unit tests reach the card's functions only through the `globalThis.__api` list built at the top of
`tests/card.test.mjs`: add a new top-level function there before testing it. `tests/e2e.mjs` is a plain
sequential script (one shared page, plain `assert`), not a test runner, so it cannot run one case alone.

ASCII check (also in CI): `grep -nP '[^\x00-\x7F]' dist/lnxlink-card.js` must print nothing.

Slash commands: `/publish` (first publication on GitHub, release, HACS default store) and
`/release X.Y.Z` (later versions). Maintainer notes: `PUBLISHING.md`.

## Layout

| Path | Content |
| --- | --- |
| `dist/lnxlink-card.js` | The whole card: one dependency-free file, no build step. HACS serves it as is |
| `tests/card.test.mjs` | Unit tests: the card runs in a `vm` sandbox, top-level functions are tested directly |
| `tests/e2e.mjs` | Playwright tests with stub `ha-card` / `ha-icon` / `ha-form` and a mocked `hass` (`callWS`, `callService`) |
| `scripts/screenshots.cjs` | Builds the README images from a fictional computer with simulated history |
| `examples/` | `minimal.yaml`, `full.yaml` |
| `README.md`, `README.it.md` | English and Italian documentation: keep them aligned |
| `hacs.json`, `.github/workflows/` | HACS metadata, validation (HACS action + tests) and release workflows |

## Architecture of the card file

In order: constants and defaults (`LNC_DEFAULTS`), entity keys `LNC_ENTITY_KEYS` and their name patterns
`LNC_MATCH`, colours, dictionary `LNC_I18N` (`en`, `it`), helpers, discovery (`lncDevices`, `lncDiscover`,
`lncResolve`, `lncSortDisks`, `lncStatus`), history (`lncSeries`, `lncPath`), editor schema, CSS, the card
class `LnxlinkCard`, the editor `LnxlinkCardEditor` (`lncCleanConfig`), registration.

- **Discovery**: devices with manufacturer `LNXlink` in `hass.devices` (first by name, or `device`). Each
  entity of the device is matched by domain and by patterns on its object id, registry name and friendly
  name without the device name (all as slugs), so renamed entity ids keep working. Temperature, IP address
  and disks have their own ranking (`lncTemperatureRank`, `lncInterfaceRank`, `lncIsDisk`). Hidden
  entities are skipped. `<key>_entity` and `disk_entities` override discovery. Discovery runs again only
  when `hass.entities` or `hass.devices` change.
- **Status**: the LWT binary sensor (`on` / `off`); without it, the CPU sensor having a value.
- **History**: one WebSocket call, `history/history_during_period` (minimal, no attributes) for CPU and
  memory, on first render and every `LNC_REFRESH_MS`.
- **Updates**: `set hass` runs at every state change; the skeleton is built once and each part (`head`,
  `alerts`, `charts`, `stor`, `grid`, `acts`) is replaced only when its HTML changes (`_set`). Clicks and
  keys are delegated from `ha-card` (`data-e` = more-info, `data-a` = power button).
- **Buttons**: a `button` entity is `unknown` until first pressed: that is not unavailability
  (`lncButtonOk`). Restart and shut down need a second tap within `LNC_CONFIRM_MS` unless
  `confirm_actions: false`.
- **Offline layout**: sections never disappear because of the computer state; values become dashes. Hiding
  the card is left to the visibility conditions of Home Assistant. Keep it that way.
- **Editor**: shows the discovered entities, but `lncCleanConfig` drops values equal to the discovered ones
  (and defaults), so the saved configuration stays minimal and discovery keeps working.

## Rules

1. `dist/lnxlink-card.js` is ASCII only. Write non-ASCII characters as `\uXXXX` escapes and run the ASCII
   check after every edit: some tools silently turn escapes into real characters.
2. Every user-visible string goes into `LNC_I18N`, in **both** `en` and `it`, with the same placeholders
   (`{n}`). Unit tests fail otherwise, including missing editor labels (`ed_<option>`).
3. Plain JavaScript custom elements, no Lit, no imports, no bundler, no runtime dependencies.
4. Values coming from Home Assistant or the configuration (names, SSID, user names, mount points) are
   escaped with `lncEsc()` or inserted with `textContent`.
5. Never put personal data in the repository: no names, e-mails, locations, time zones, real entity ids,
   host names, IP addresses, network names or details of a specific Home Assistant instance. Examples use
   documentation values (`192.0.2.x`, `192.168.1.x`, `workstation`, `Demo-WiFi`); images use fictional demo
   data only (`npm run screenshots`). Copyright holder: "The lnxlink-card contributors".
6. Until `/publish` runs, the repository owner is the placeholder `GITHUB_USER`. Do not hardcode another
   owner; `/publish` replaces it everywhere except in `PUBLISHING.md`, `CLAUDE.md` and `.claude/`.
7. Version lives in three places: `LNC_VERSION` in the card, `version` in `package.json`, `CHANGELOG.md`.
   The release workflow fails if the tag `vX.Y.Z` does not match.
8. User-facing changes: update `CHANGELOG.md` (section `Unreleased`) and both READMEs; regenerate the
   images when the look of the card changes.

## Trying it on a Home Assistant instance

Copy `dist/lnxlink-card.js` to `/config/www/` and add the resource `/local/lnxlink-card.js?v=N` (type
JavaScript module), bumping `N` to bypass caches; or add the GitHub repository to HACS as a custom
repository of type Dashboard. Remove other copies of the resource: the console warns about duplicates.
