# Changelog

All notable changes to CLER Vision will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-10

### Added
- Initial production release
- Work order management system with Excel import/export
- Comprehensive lens calculations (RC1, AC1, AC2, AC3)
- DIF file generation for lens manufacturing
- Auto-update support for seamless updates
- System tray integration (Windows)
- Configurable application settings
- Environment-aware logging system
- Dynamic Content Security Policy based on environment

### Fixed
- RC1 Tor calculation precision issues (maintains full precision through calculation chain)
- AC2/AC3 calculation accuracy (uses correct AC1 values for base calculations)
- Proper error propagation in lens calculations

### Security
- Content Security Policy configured for production
- Context isolation enabled
- Restricted API endpoints per environment

## [Unreleased]

### Planned
- Code signing for Windows builds (v1.1.0)
- macOS and Linux builds
- Automated CI/CD pipeline
- Error tracking integration
