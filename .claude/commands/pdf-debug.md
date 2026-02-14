Debug a PDF rendering issue in the VTO Builder.

The PDF generation code is in `index.html` inside the `exportPDF()` function (approximately lines 1239-2022). It uses jsPDF's low-level drawing API with all measurements in millimeters.

## Diagnostic Steps

### 1. Identify the Problem Area

Determine which page and section is affected:

**Page 1 - Vision (4-column layout)**:
- Column 1: Core Values, Core Focus, 10-Year Target
- Column 2: 3-Year Picture (with Revenue Diamond)
- Column 3: Target Market, Three Uniques, Proven Process
- Column 4: Guarantee

**Page 2 - Traction (3-column layout)**:
- Column 1: 1-Year Plan (with Revenue Diamond)
- Column 2: Quarterly Rocks (with owner badges)
- Column 3: Issues List (with status badges)

### 2. Load Test Data

Import `efsj-prefill.json` into the app to get a full dataset, then export PDF. This exercises all sections with real data including long text that wraps.

### 3. Check These Common Issues

**Text overflow / clipping**:
- Every `drawText()` and `drawList()` call should pass a `maxY` parameter
- Section heights should use `measureListHeight()` or `measureTextHeight()` instead of hardcoded values
- Look for any remaining static height calculations (the fix in v2.0.0 caught most of them)

**Text rendering as "?" or blank**:
- The `toAscii()` function (around line 1134) converts Unicode to ASCII
- Add new replacements there for any unhandled characters
- jsPDF only supports Helvetica/Times/Courier built-in fonts

**Sections overlapping**:
- Each column tracks its Y position independently (y1, y2, y3, y4)
- Section heights must account for: header (7mm) + dark accent line (0.8mm) + padding + content
- The `drawModernSection()` function returns the Y position after the header

**Revenue Diamond issues**:
- `drawRevenueDiamond()` draws two triangles and a diamond border
- Diamond is centered in column: `(colWidth - diamondSize) / 2`
- Diamond size is 28mm -- changing this affects all positioning below it

**Wrong dates (off by one day)**:
- `formatDate()` must parse as local time: `new Date(year, month, day)`
- NOT `new Date(dateStr)` which parses as UTC

### 4. Key Variables

```
margin = 10mm
headerHeight = 18mm
footerHeight = 8mm (approx)
cornerRadius = 3mm

Page 1 columns: colWidth = (contentWidth - 12) / 4
Page 2 columns: tColWidth = (contentWidth - 8) / 3

deepRed = [139, 38, 5]
darkBrown = [49, 41, 38]
```

### 5. Test Both Formats

Always test with both PDF format options:
- Letter (11 x 8.5 inches = 279.4 x 215.9mm)
- iPad 11" (9.5 x 7 inches = 241.3 x 177.8mm)

The iPad format has less space, so overflow is more likely.

### 6. After Fixing

- Export PDF with both formats
- Verify all sections render within their boundaries
- Check that text truncation indicators ("...", "(+N more)") appear correctly
- Verify no console errors during export
