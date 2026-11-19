# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-11-19

First public release.

### Added

- Card for Linux computers monitored with LNXlink: header with online status, IP address, Wi-Fi network
  and CPU load; CPU and RAM charts from the recorder history; storage bars per partition with totals;
  CPU temperature, pending system updates, Wi-Fi signal, download and upload rate, logged-in user and
  uptime; alerts for required restart, system updates and new LNXlink versions.
- Power buttons (suspend, restart, shut down) with a second-tap confirmation for restart and shut down,
  disabled while the computer is offline. Buttons that were never pressed (state `unknown`) work.
- Automatic discovery of the LNXlink computer and of all its entities from the device registry, robust to
  renamed entity ids; device picker and per-entity overrides in the visual editor, which saves only what
  differs from discovery.
- Stable layout while the computer is offline: sections stay, values become dashes.
- English and Italian localization of the card and of the visual editor; numbers follow the Home Assistant
  number format.
- Native look: theme colours, light and dark mode, sections layout, keyboard accessible, reduced motion.
- Warning in the browser console when two copies of the card are loaded.
- Unit tests, browser end-to-end tests, HACS validation and release workflows.

[Unreleased]: https://github.com/artech-lab/lnxlink-card/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/artech-lab/lnxlink-card/releases/tag/v1.0.0
