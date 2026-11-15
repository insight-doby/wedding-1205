# Gallery grid revision — 2026-11-16

Backup branch: `backup/gallery-swipe-20261116`
Base commit: `dc55138159827297db57b35ca08d4616f113734d`

- Keep all 37 approved photos, unchanged sources and order.
- Preserve full source proportions: height auto; no cropping.
- Related portrait pairs use two columns; landscape and unpaired photos span the full row.
- Ring -> eye-contact sequence remains side by side.
- Initially 18 photos, Show more reveals the remaining 19.
- Retain fullscreen photo navigation and closing controls.
- Upgrade gallery markup from gallery.js; leave index.html and all existing configuration untouched.
- Other invitation sections, palette, fonts, cover and sharing remain unchanged.

Rollback by reverting this commit, or restoring assets/js/gallery.js and assets/css/gallery.css from the backup branch. Earlier backup/gallery-before-20261115 remains. Never force-reset main over unrelated later edits.
