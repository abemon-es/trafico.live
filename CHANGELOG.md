# Changelog

All notable changes to trafico.live are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

## [1.0.0] - 2026-03-24

### Added
- OKLCH-based brand palette, typography system, and design tokens
- Dark mode toggle with persistent preference
- Global search overlay with Redis caching and homepage SSR

### Changed
- Rebrand to trafico.live with full brand kit independence
- Homepage split into server-rendered page + client wrapper for performance

### Fixed
- `/profesional/diesel` and `/profesional/restricciones` aligned with actual API responses
- VariablePanel display names corrected across professional portal
- Graceful fallback when `DATABASE_URL` is missing at build time

---

## [0.9.0] - 2026-02-15

### Added
- SEO landing pages: radares, camaras, fuel prices, ZBE city pages, accident black spots,
  traffic operations, restrictions, Semana Santa 2026, and cheapest gas by city
- EV charging calculator and live traffic-by-city pages
- 24h station listings and per-road radar pages
- 3 blog articles covering high-traffic seasonal topics
- Internal linking mesh and ad infrastructure (affiliate widgets, programmatic station SEO)
- Canonical URLs across all public routes
- Google Analytics GA4 via updated Content Security Policy

### Fixed
- Province ranking reads `province` field directly (was incorrectly using null `provinceName`)
- `ZBEResponse` type error in empty-state check
- `explorar/infraestructura` ZBE data shape and incidencias map overflow
- Tab counts show loading placeholder instead of stale zeroes

### Changed
- DGT stats replaced 111 MB XML fetch with a direct DB count query

---

## [0.8.0] - 2025-12-01

### Added
- Route calculator and professional portal with API documentation
- Blog engine and PWA support (service worker, manifest)
- Fuel price charts, PMV panels, and weather alert pages
- Speed limit pages, EV filters, and incident analytics dashboard
- Best travel time tool, station price history, and fuel price comparator
- Redis caching layer on key data endpoints

### Fixed
- `BreakdownCharts` self-fetches data when no props are provided
- `FuelPriceChart` switched to direct import to fix dynamic-loading issue
- Split homepage into server page + client wrapper to resolve SSR hydration issues
