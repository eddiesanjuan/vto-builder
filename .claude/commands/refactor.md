Safely refactor a section of the VTO Builder's `index.html` (~2,037 lines, single-file vanilla JS app).

Ask the user: **"What area do you want to refactor?"** If no answer is given, default to the highest-impact target: the `exportPDF()` function (lines 1239-2022, ~780 lines).

## Architecture Constraint

This is a single-file application with zero build step. All CSS (lines 8-453), HTML (lines 455-755), and JavaScript (lines 757-2037) live in `index.html`. Any refactoring MUST preserve this single-file architecture. Do NOT split into multiple files unless the user explicitly requests it.

## Pre-Change Verification (MANDATORY)

Before touching ANY code, verify the current state works:

1. **Data roundtrip check**: Read `getDefaultData()` (line 759) and confirm every field appears in `collectFormData()` (line 958), `populateForm()` (line 1030), and `normalizeData()` (line 1056).

2. **List rendering check**: Confirm `renderList()` (line 825), `renderRocksList()` (line 846), and `renderIssuesList()` (line 870) all follow the same pattern: clear container with `innerHTML = ''`, iterate with `forEach`, create div with `document.createElement`, set `innerHTML` with `escapeHtml()` values, append to container.

3. **PDF helper inventory**: List all helper functions defined inside `exportPDF()` and their line ranges:
   - `drawModernSection()`, `drawText()`, `drawList()`, `drawLabel()`
   - `drawMetric()`, `drawRevenueDiamond()`, `measureListHeight()`, `measureTextHeight()`
   - `drawPageHeader()`, `drawPageFooter()`, `roundedRect()`

4. **Note the current version**: Line 458 shows `v2.0.0`. A refactor that changes behavior requires a version bump.

## Refactoring Targets (by priority)

### Target A: Extract PDF Helper Functions (HIGH IMPACT)

The `exportPDF()` function (lines 1239-2022) contains ~10 nested helper functions. These are only used during PDF generation but can be extracted to module-level scope:

- Extract `drawModernSection`, `drawText`, `drawList`, `drawLabel`, `drawMetric`, `drawRevenueDiamond`, `measureListHeight`, `measureTextHeight`, `drawPageHeader`, `drawPageFooter`, `roundedRect`
- Each takes `doc` (the jsPDF instance) as a parameter instead of using closure
- The color constants (`deepRed`, `darkBrown`, `white`, etc. at lines 1270-1276) become a shared `PDF_COLORS` object

### Target B: Deduplicate List Rendering (MEDIUM IMPACT)

`renderList()` (line 825), `renderRocksList()` (line 846), and `renderIssuesList()` (line 870) share 80% of their structure. Refactor into a single `renderListGeneric(containerId, items, templateFn)` where `templateFn` produces the inner HTML for each item type.

### Target C: Extract Data Layer (MEDIUM IMPACT)

Group these related functions into a clear data management section:
- `getDefaultData()` (line 759)
- `collectFormData()` (line 958)
- `collectListsFromDOM()` (line 983)
- `populateForm()` (line 1030)
- `normalizeData()` (line 1056)
- `saveToLocalStorage()` (line 1099)
- `loadFromLocalStorage()` (line 1107)
- `exportJSON()` (line 1154)
- `importJSON()` (line 1172)

Add clear section comment headers (e.g., `// ========== DATA LAYER ==========`).

### Target D: Reduce PDF Page Layout Duplication (LOWER IMPACT)

Page 1 and Page 2 in `exportPDF()` repeat similar column-setup, header-drawing, and footer-drawing patterns. Extract a `renderPDFPage(doc, pageConfig)` function.

## Incremental Change Protocol

For EACH refactoring change:

1. **Describe** what you will change and why
2. **Make the change** -- one logical extraction/refactor at a time
3. **Verify** immediately after:
   - All functions still exist and are callable
   - No variables reference undefined closures
   - The `escapeHtml()` function (line 1219) is still used in all `innerHTML` assignments
   - The `toAscii()` function (line 1134) is still called on all text going into jsPDF
   - `collectFormData()` + `collectListsFromDOM()` are still called before every data operation (save, export JSON, export PDF)
4. **Do NOT proceed** to the next change if verification fails

## Post-Change Verification (MANDATORY)

After all refactoring is complete:

1. Verify `getDefaultData()` still returns the same 25+ field object
2. Verify `exportPDF()` still calls `collectFormData()` + `collectListsFromDOM()` at the top
3. Verify all `drawText()` / `drawList()` calls still pass `maxY` for overflow protection
4. Verify `escapeHtml()` is still applied to all user content in innerHTML assignments
5. Verify the version at line 458 is bumped (PATCH for pure refactor, MINOR if behavior changes)
6. Check that no `console.log` debug statements were left in

## Version Bump

Increment the PATCH version in the header (line 458) for a pure refactor:
```html
<small style="...">v2.0.1</small>
```
