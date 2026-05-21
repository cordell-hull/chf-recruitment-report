# Recruiting Report

Static web app (no build step) for host schools to document their J-1 teacher recruitment process. Runs entirely in the browser using ES modules and pdf-lib.

## Local Development

```bash
python3 -m http.server 8082
# Open http://localhost:8082
```

Must be served over HTTP — `file://` won't work due to ES module imports.

## Versioning

Version is defined in `config/version.js` as the single source of truth. It is displayed in the page footer and included in debug reports.

**When releasing changes**, update both:
1. `APP_VERSION` in `config/version.js`
2. The `?v=` query strings on `<link>` and `<script>` tags in `index.html`

## Key Files

- `index.html` — Main page, 7-step wizard, reference template
- `main.js` — Wizard logic, state management, validation, signature canvas, draft auto-save
- `lib/pdf.js` — PDF generation with pdf-lib (text sections + signature image)
- `lib/storage.js` — Generic localStorage draft module (shared across CHF forms)
- `config/org.js` — Organization branding, PDF styling constants
- `config/version.js` — App version constant
- `styles.css` — All styles including toggle switches and signature pad

## Auto-save

Drafts are saved to `localStorage` every 30 seconds and on step transitions. On page load, a modal prompts the user to resume or discard. Drafts are cleared after successful PDF download. Signature canvas data is stored as a data URL.

## PDF Generation Notes

- Uses standard Helvetica font (WinAnsi encoding) — text passed to `drawText()` must not contain control characters.
- Signature is embedded as a PNG image from canvas `toDataURL()`.
- Numbered sections (1-9) match the original document structure.
