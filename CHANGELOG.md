# Changelog

Notable changes to this project will be documented in this file.

---

## [1.0.1] - 2025-04-23
### Changed
- Refactored `packet_montior` class to correctly handle filtering private address blocks
- Host-related traffic filtering simplified and improved for accuracy

### Fixed
- Found bug where some valid traffic was being skipped due to host IP exclusion logic being too aggressive

---

## [1.0.0] - 2025-04-08
### Added
- Initial public release of ipflux.io
- Pre-packaged distributions provided for .deb and .tar.gz
