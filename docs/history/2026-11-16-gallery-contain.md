# Compact full-photo gallery — 2026-11-16

Backup: `backup/gallery-grid-20261116`
Base commit: `9602acaaa450d55cacdd041e210a9d1c4ae8b485`

User approved a fixed-height horizontal gallery that preserves full image proportions. Keep all 37 photos and original order. Landscape photos are single pages; consecutive related portrait photos share a side-by-side page. Ring-view then eye-contact pair remains together. Frames use 58svh (58vh fallback), minimum 240px, maximum 560px. All tiles use object-fit:contain; empty areas use the existing gallery background. Native CSS scroll snap, indicators, adjacent-page preloading, fullscreen photo viewer retained. Remove Show more because the album has constant height. Only gallery JS/CSS and this history file change; index.html, account/API settings, cover, fonts, colors and other sections are untouched.

Rollback by reverting this commit in a new commit, or restoring assets/js/gallery.js and assets/css/gallery.css from the backup branch. Older original-grid and swipe backups remain available. Do not force-reset main over later unrelated work.
