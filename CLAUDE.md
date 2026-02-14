# VTO Builder

## What This Project Does

A single-page web application for creating and exporting EOS (Entrepreneurial Operating System) Vision/Traction Organizer documents. Built for E.F. San Juan, a luxury custom millwork company in Northwest Florida.

The VTO is a two-page strategic planning document used in EOS-run companies. This tool replaces paper/spreadsheet VTOs with a form-based editor that exports professional branded PDFs.

**Primary users**: Non-technical managers and leadership team members at E.F. San Juan and its departments (e.g., Back-End Operations has its own VTO).

## Tech Stack

- **HTML + CSS + Vanilla JavaScript** -- single file, zero build step
- **jsPDF 2.5.1** (CDN) -- client-side PDF generation
- **No framework, no bundler, no package.json** -- open `index.html` directly in a browser
- Hosted as a static file (can be served from GitHub Pages, S3, or any static host)

## Architecture

### Single File: `index.html` (~2,037 lines)

The entire app lives in one file with three sections:

1. **CSS** (lines 8-453): Custom properties, responsive layout, form styling. EFSJ brand colors: deep red `#8b2605`, dark brown `#312926`. No Tailwind -- all hand-written.

2. **HTML** (lines 455-755): Two-tab form (Vision / Traction) with dynamic list management for core values, bullets, rocks, issues, etc. Company info header with brand gradient.

3. **JavaScript** (lines 757-2037): All application logic:
   - **Data model** (`vtoData` object, `getDefaultData()`) -- flat structure with arrays for lists
   - **DOM rendering** (`renderList`, `renderRocksList`, `renderIssuesList`) -- imperative DOM manipulation
   - **Data collection** (`collectFormData`, `collectListsFromDOM`) -- reads input values back from DOM
   - **Persistence** (`saveToLocalStorage`, `loadFromLocalStorage`) -- JSON in localStorage key `vtoData`
   - **Import/Export** (`exportJSON`, `importJSON`) -- JSON file download/upload
   - **PDF generation** (`exportPDF`, lines 1239-2022) -- the largest function, ~780 lines

### PDF Generation (the core complexity)

The PDF renderer is hand-coded using jsPDF's low-level drawing API. Key concepts:

- **Two-page landscape layout**: Page 1 = Vision (4 columns), Page 2 = Traction (3 columns)
- **Revenue Diamonds**: Signature EOS visual -- rotated squares showing revenue/profit in deep red
- **Dynamic section sizing**: `measureListHeight()` and `measureTextHeight()` pre-calculate wrapped text heights before drawing boxes
- **Overflow protection**: `drawText()` and `drawList()` accept `maxY` parameter to truncate with "..." or "(+N more)" indicators
- **Two format options**: Letter (11x8.5") and iPad 11" (9.5x7")
- **ASCII normalization**: `toAscii()` converts smart quotes, em dashes, etc. because jsPDF's default font doesn't support them

### Supporting Files

- `efsj-prefill.json` -- Company-wide VTO template with real E.F. San Juan data
- `backend-ops-prefill.json` -- Department-level VTO template for Back-End Operations
- `SPEC.md` -- Original requirements document
- `FIX_SUMMARY.md` -- Documentation of the PDF text wrapping fix (v2.0.0)
- `.claude/audits/` -- Audit reports from the PDF fix project

## Key Patterns and Conventions

### Data Flow

```
User types in form
  -> DOM input elements hold current values
  -> collectFormData() + collectListsFromDOM() read DOM into vtoData object
  -> vtoData is serialized to JSON for save/export/PDF
```

This is important: **the DOM is the source of truth for lists**, not the `vtoData` object. The `collectListsFromDOM()` function exists because list items use `onchange` handlers that may not fire before export. Always call both `collectFormData()` and `collectListsFromDOM()` before any data operation.

### List Management

Simple lists (core values, bullets, goals, etc.) use a `[string]` array. Rocks use `[{text, owner}]`. Issues use `[{text, status}]`. Each has its own render/add/update/remove functions.

Minimum of 1 item is always maintained -- removing the last item is a no-op.

### innerHTML Usage

The `renderList`, `renderRocksList`, and `renderIssuesList` functions use `innerHTML` with `escapeHtml()` for XSS protection. The `escapeHtml()` function uses `document.createElement('div')` + `textContent` for safe encoding.

### PDF Helper Functions

| Function | Purpose |
|----------|---------|
| `drawModernSection(title, x, y, w, h)` | Rounded rect with red header bar |
| `drawText(text, x, y, maxW, fontSize, bold, color, maxY)` | Word-wrapped text with overflow |
| `drawList(items, x, y, maxW, numbered, lineH, maxY)` | Bullet/numbered list with overflow |
| `drawLabel(text, x, y, useDark)` | Small uppercase label |
| `drawMetric(label, value, x, y, w)` | Metric badge (legacy) |
| `drawRevenueDiamond(x, y, size, revenue, profit)` | EOS diamond visual |
| `measureListHeight(items, maxW, opts)` | Pre-measure list height |
| `measureTextHeight(text, maxW, fontSize)` | Pre-measure text block height |
| `drawPageHeader(pageNum, pageTitle)` | Full-width branded header |
| `drawPageFooter()` | Footer with date and brand |

### Version

Current version: **v2.0.0** (displayed in header). Version is hardcoded in the HTML at line 458.

## Development Workflow

### Running Locally

```bash
# Option 1: Just open the file
open index.html

# Option 2: Local server (avoids file:// quirks)
python3 -m http.server 8000
# Then visit http://localhost:8000
```

No build step. No npm install. No compilation.

### Testing

No automated test suite exists. Testing is manual:

1. Open `index.html` in a browser
2. Import a prefill JSON to populate data: click "Import JSON" and select `efsj-prefill.json`
3. Switch between Vision and Traction tabs
4. Export PDF in both Letter and iPad formats
5. Verify text wrapping, section boundaries, and overflow indicators in the PDF
6. Test save/load via localStorage
7. Test clear functionality

### Common Changes

**Adding a new VTO field**:
1. Add to `getDefaultData()` return object
2. Add HTML form element with matching `id`
3. Add to `collectFormData()` to read from DOM
4. Add to `populateForm()` to write to DOM
5. Add to `normalizeData()` for import compatibility
6. Add PDF rendering in `exportPDF()` at the appropriate column/position

**Modifying PDF layout**:
- Page 1 Vision uses a 4-column grid: Core Values+Focus+10yr | 3-Year Picture | Marketing Strategy | Guarantee
- Page 2 Traction uses a 3-column grid: 1-Year Plan | Quarterly Rocks | Issues List
- All measurements are in millimeters (jsPDF units)
- After changing section sizes, verify overflow protection still works

**Changing branding**:
- CSS variables in `:root` control the web UI colors
- PDF colors are defined as RGB arrays in `exportPDF()` (lines 1270-1276)
- The header hardcodes "E.F. SAN JUAN" text and tagline

## Gotchas

1. **jsPDF font limitations**: Only Helvetica/Times/Courier built-in. Smart quotes, em dashes, and other Unicode will render as `?` or blank. The `toAscii()` function handles known cases but new Unicode characters may need additions.

2. **Date timezone bug (fixed)**: `formatDate()` parses dates as local time using `new Date(year, month, day)` instead of `new Date(dateStr)` to avoid off-by-one day errors from UTC conversion.

3. **List data sync**: List changes are captured via `onchange` on inputs, but if a user types without blurring, the `vtoData` object may be stale. That is why `collectListsFromDOM()` reads directly from DOM before any export.

4. **PDF section overflow**: If too much content exists for a section, text is truncated. The `maxY` parameter on `drawText` and `drawList` prevents rendering outside section boundaries. Always use `measureListHeight`/`measureTextHeight` for dynamic sizing and pass `maxY` for overflow safety.

5. **No autosave**: Data is only persisted when the user clicks "Save". The `input` event listener calls `collectFormData()` but does NOT save to localStorage -- that is intentional to avoid excessive writes.

6. **innerHTML in list rendering**: While `escapeHtml()` is applied, switching to `document.createElement()` for all user-content rendering would be safer long-term.

## Prefill Templates

Two JSON templates exist for quick population:

- `efsj-prefill.json` -- Full company VTO with real strategic data (revenue targets, rocks, issues)
- `backend-ops-prefill.json` -- Department-level VTO with placeholder fields marked `[MANAGER INPUT NEEDED]`

These follow the exact schema of `getDefaultData()` and can be imported via the "Import JSON" button.
