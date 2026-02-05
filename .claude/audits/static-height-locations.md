# Static Height Calculation Locations in VTO Builder

**Audit Date:** 2026-02-05
**Auditor:** @auditor #2
**File:** `/Users/eddiesanjuan/projects/vto-builder/index.html`
**Scope:** PDF generation static height calculations that do not account for text wrapping

---

## Executive Summary

The PDF export function (`exportPDF()`) contains **14 distinct locations** where section heights are calculated using static formulas that assume fixed line heights. These calculations will fail when text wraps to multiple lines, causing content overflow and truncation.

The core problem: **`items.length * X + Y` assumes each item is exactly one line**, but `doc.splitTextToSize()` can return multiple lines per item.

---

## Critical Findings (Will Cause Visible Bugs)

### 1. Core Values Section Height
**Line:** ~1483
**Code:**
```javascript
const cvHeight = Math.max(30, cvItems.length * 3.5 + 14);
```
**What it calculates:** Height of the Core Values box based on number of items
**Why problematic:** Assumes each core value is exactly 1 line (3.5mm). A core value like "We pursue excellence in every detail of our craftsmanship and customer service" will wrap to 2-3 lines but only gets allocated 3.5mm.

---

### 2. Target Market Section Height
**Line:** ~1554
**Code:**
```javascript
const tmHeight = Math.max(35, tmItems.length * 3.5 + 16);
```
**What it calculates:** Height of Target Market box
**Why problematic:** Same issue - each target market bullet gets 3.5mm regardless of content length.

---

### 3. Three Uniques Section Height
**Line:** ~1562
**Code:**
```javascript
const tuHeight = Math.max(35, tuItems.length * 3.5 + 12);
```
**What it calculates:** Height of Three Uniques box
**Why problematic:** "Uniques" are often verbose differentiators that wrap. Formula assumes 1 line per unique.

---

### 4. Proven Process Section Height (Derivative)
**Line:** ~1568
**Code:**
```javascript
const ppHeight = availHeight - tmHeight - tuHeight - 6;
```
**What it calculates:** Remaining space for Proven Process section
**Why problematic:** If `tmHeight` and `tuHeight` are underestimated (due to wrapping), Proven Process gets too much space. If content overflows above, this calculation is meaningless.

---

### 5. 10-Year Target Section Height (Derivative)
**Line:** ~1508
**Code:**
```javascript
const tenHeight = availHeight - (cvHeight + cfHeight + 6);
```
**What it calculates:** Remaining space for 10-Year Target after Core Values and Core Focus
**Why problematic:** If `cvHeight` is underestimated, the 10-Year Target box position is wrong.

---

### 6. Core Focus Section Height (Hardcoded)
**Line:** ~1498
**Code:**
```javascript
const cfHeight = 38;
```
**What it calculates:** Fixed height for Core Focus section (Purpose + Niche)
**Why problematic:** This is completely static - no consideration for whether Purpose or Niche text wraps. Long mission statements will overflow.

---

## Medium Findings (Line Advancement Issues)

### 7. drawList() Line Height
**Lines:** ~1343-1370
**Code:**
```javascript
function drawList(items, x, y, maxWidth, numbered = false, lineHeight = 3.2) {
    ...
    currentY += lines.length * lineHeight;
    ...
}
```
**What it calculates:** Y position advancement after each list item
**Why problematic:** This function correctly handles wrapping internally (`lines.length * lineHeight`), BUT the section height calculated externally (items 1-3 above) doesn't use this logic. The external height calculation assumes `items.length` not `total_lines_after_wrapping`.

---

### 8. Rocks List Y Advancement
**Line:** ~1694
**Code:**
```javascript
qrY += rockLines.length * 3.2 + 2;
```
**What it calculates:** Y advancement after each rock item
**Why problematic:** This correctly accounts for wrapped lines, BUT the section box height (`rocksHeight = availHeight`) is fixed. If total rock content exceeds `availHeight`, text will overflow the box boundary.

---

### 9. Issues List Y Advancement
**Line:** ~1747
**Code:**
```javascript
issY += issueLines.length * 3.2 + 2;
```
**What it calculates:** Y advancement after each issue item
**Why problematic:** Same as #8 - internal tracking is correct but external box height is fixed.

---

## Low Priority (Design Constants)

### 10. Header Height
**Line:** ~1266
**Code:**
```javascript
const headerHeight = 18;
```
**What it calculates:** Page header bar height
**Why problematic:** Minor - header content is predictable, but if company name is very long, it could overflow.

---

### 11. Footer Height
**Line:** ~1467
**Code:**
```javascript
const footerHeight = 8;
```
**What it calculates:** Space reserved for footer
**Why problematic:** Low risk - footer content is minimal.

---

### 12. Section Header Height (in drawModernSection)
**Line:** ~1291-1292
**Code:**
```javascript
function drawModernSection(title, x, y, width, height, opts = {}) {
    const headerH = opts.headerHeight || 7;
```
**What it calculates:** Section title bar height
**Why problematic:** Low risk - section titles are short and uppercase.

---

### 13. drawMetric() Fixed Return
**Line:** ~1388
**Code:**
```javascript
return y + 9;
```
**What it calculates:** Height consumed by a metric badge (Revenue/Profit)
**Why problematic:** Minor - metric values are typically short numbers.

---

### 14. Column Width Calculations
**Lines:** ~1469-1476
**Code:**
```javascript
const colWidth = (contentWidth - (colGap * 3)) / 4;
```
**What it calculates:** Fixed column widths for 4-column layout
**Why problematic:** Not a height issue but affects text wrapping thresholds.

---

## Recommended Fix Pattern

For each section that contains dynamic list content, replace:

```javascript
// BEFORE (static)
const cvHeight = Math.max(30, cvItems.length * 3.5 + 14);
```

With a pre-calculation that measures actual wrapped content:

```javascript
// AFTER (dynamic)
function measureListHeight(items, maxWidth, lineHeight = 3.2, numbered = false) {
    let totalHeight = 0;
    const filtered = items.filter(item => item && String(item).trim());
    filtered.forEach(item => {
        const lines = doc.splitTextToSize(toAscii(item), maxWidth - (numbered ? 6 : 5));
        totalHeight += lines.length * lineHeight;
    });
    return totalHeight;
}

const cvContentHeight = measureListHeight(cvItems, colWidth - 8, 3.2, true);
const cvHeight = Math.max(30, cvContentHeight + 14);
```

---

## Priority Order for Fixes

| Priority | Location | Impact |
|----------|----------|--------|
| P0 | Core Values height (line 1483) | Visible truncation on real data |
| P0 | Target Market height (line 1554) | Visible truncation |
| P0 | Three Uniques height (line 1562) | Visible truncation |
| P1 | Core Focus hardcoded (line 1498) | Long purpose/niche overflow |
| P1 | Proven Process derivative (line 1568) | Cascading layout error |
| P1 | 10-Year Target derivative (line 1508) | Cascading layout error |
| P2 | Box boundaries vs content (lines 1694, 1747) | Content escapes box |

---

## Fleet Feedback

**FRICTION:** The PDF generation code is 500+ lines in a single function. Identifying all static calculations required reading the entire function.

**MISSING_CONTEXT:** No test suite or sample data to verify which sections actually overflow in production.

**SUGGESTION:** @developer should extract PDF section rendering into individual functions with explicit height return values, making it obvious what contributes to layout calculations.
