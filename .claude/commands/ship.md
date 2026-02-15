Run a full release readiness check for the VTO Builder. This is a go/no-go gate before deploying.

Work through every section below. Report PASS or FAIL for each check. At the end, give a single GO or NO-GO verdict.

## 1. HTML Syntax Validation

Open `index.html` and verify:
- All tags are properly closed (the file is ~2,037 lines, single-file architecture)
- No orphaned `<div>`, `<section>`, or `<script>` tags
- The `<head>` block (lines 3-454) has matching open/close for `<style>`
- The `<body>` block (lines 455-2036) has matching open/close for `<script>` (line 757-2035)
- All form elements inside Vision tab (`<div id="vision">`) and Traction tab (`<div id="traction">`) have matching close tags

## 2. CDN Link Accessibility

Check that the jsPDF CDN link on line 7 is reachable:
```
https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
```
Use `curl -sI` to verify it returns HTTP 200. If this link is down, PDF export is completely broken.

NOTE: There is no `integrity` or `crossorigin` attribute on this script tag. Flag this as a security recommendation (the `/security` command covers this in depth).

## 3. PDF Generation Verification

Review the `exportPDF()` function (lines 1239-2022) and verify:
- `collectFormData()` and `collectListsFromDOM()` are both called at the top (lines 1241-1242) -- this is critical because the DOM is the source of truth for lists
- The jsPDF constructor creates landscape orientation with correct dimensions (lines 1247-1261):
  - Letter: 279.4 x 215.9mm
  - iPad: 241.3 x 177.8mm
- All `drawText()` and `drawList()` calls pass a `maxY` parameter for overflow protection
- The `toAscii()` function (lines 1134-1151) handles smart quotes, em dashes, ellipsis, non-breaking spaces, and bullets
- The file save uses `sanitizeFilename()` (lines 1124-1131) on the company name

Check both PDF template paths:
- **Page 1 Vision**: 4-column layout (Core Values+Focus+10yr | 3-Year Picture | Marketing Strategy | Guarantee)
- **Page 2 Traction**: 3-column layout (1-Year Plan | Quarterly Rocks | Issues List)

## 4. localStorage Save/Load Cycle

Verify the save/load logic is consistent:
- `saveToLocalStorage()` (lines 1099-1104): calls `collectFormData()` + `collectListsFromDOM()` then `localStorage.setItem('vtoData', ...)`
- `loadFromLocalStorage()` (lines 1107-1121): calls `localStorage.getItem('vtoData')`, parses JSON, runs through `normalizeData()`, then `populateForm()`
- `clearAll()` (lines 1193-1207): calls `localStorage.removeItem('vtoData')`
- `normalizeData()` (lines 1056-1096) applies type-safe defaults for every field in `getDefaultData()`

Check that every field in `getDefaultData()` (lines 759-790) has corresponding entries in:
- `collectFormData()` (lines 958-980)
- `populateForm()` (lines 1030-1053)

## 5. Version Number Consistency

The version is displayed in the header at line 458:
```html
<small style="...">v2.0.0</small>
```
Check that:
- The version string matches what CLAUDE.md documents (currently v2.0.0)
- The version appears in the rendered header
- If any code changes have been made since v2.0.0, flag that the version should be bumped

## 6. Form Field Completeness

Verify every field in the data model has a complete roundtrip:

| Field | `getDefaultData()` (line 759) | HTML input | `collectFormData()` (line 958) | `populateForm()` (line 1030) |
|-------|-------------------------------|------------|-------------------------------|------------------------------|
| companyName | yes | #companyName | yes | yes |
| vtoDate | yes | #vtoDate | yes | yes |
| quarter | yes | #quarter | yes | yes |
| theBar | yes | #theBar | yes | yes |
| coreValues | yes (array) | #coreValuesList | via collectListsFromDOM | via initializeLists |
| purpose | yes | #purpose | yes | yes |
| niche | yes | #niche | yes | yes |
| ... continue for ALL 25+ fields |

Flag any field that is missing from any of the four columns.

## 7. Prefill Template Compatibility

Verify both prefill JSON files match the `getDefaultData()` schema:
- `efsj-prefill.json` -- company-wide template
- `backend-ops-prefill.json` -- department template

Check that every key in each JSON file exists in `getDefaultData()` and that no extra/unknown keys are present.

## 8. Go/No-Go Summary

Format the final report as:

```
RELEASE READINESS: [GO / NO-GO]

PASSED:
- [list of passed checks]

FAILED:
- [list of failed checks with specific line numbers and details]

RECOMMENDATIONS:
- [non-blocking improvements to consider]
```
