# Recruiting Report

Static web app (no build step) for host schools to document their J-1 teacher recruitment process. Runs entirely in the browser using ES modules and pdf-lib. Supports multiple teachers per report.

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

- `index.html` — Main page, 5-step wizard (School, Teachers, Services, Sign, Review)
- `main.js` — Wizard logic, multi-teacher state, table/form view, validation, signature canvas, persistent storage
- `lib/pdf.js` — PDF generation with pdf-lib (summary table + per-teacher sections + signature)
- `config/org.js` — Organization branding, PDF styling constants
- `config/version.js` — App version constant
- `styles.css` — All styles including toggle switches, checkbox groups, teacher table, landing screen, and signature pad

## Data Persistence

All report data is saved to `localStorage` under key `chf-recruitment-data` — on every step transition, teacher save, and every 30 seconds via auto-save. On page load, if saved data exists, a landing screen offers "Continue" or "Start New Report" (with confirmation). Data persists across sessions and PDF downloads — only cleared when user explicitly starts a new report. Signature canvas data is stored as a data URL.

## Multi-Teacher Flow

Step 2 (Teachers) uses a table/form toggle pattern:
- **Table view** (default): lists all teachers with Edit/Delete buttons and an "Add Teacher" button
- **Form view**: replaces the table when adding/editing a teacher; includes teacher info, interview details, communication venues (checkboxes), 2 references, and English assessment
- Pre-populate: when adding teacher #2+, shared fields (place, country, venues) are copied from the previous teacher

## PDF Generation Notes

- Uses standard Helvetica font (WinAnsi encoding) — text passed to `drawText()` must not contain control characters.
- Summary table at top with teacher name, email, interview date, place.
- Per-teacher sections with interview details, references, English assessment.
- Shared sections (relocation, certification) and signature appear once at end.
- Signature is embedded as a PNG image from canvas `toDataURL()`.
