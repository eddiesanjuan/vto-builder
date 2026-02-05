# PDF Generation Analysis - VTO Builder

**Audit Date:** 2026-02-05
**Auditor:** @auditor #1
**Scope:** PDF generation code analysis in `/Users/eddiesanjuan/projects/vto-builder/index.html`

---

## Executive Summary

The VTO Builder uses **jsPDF 2.5.1** loaded from CDN for PDF generation. The implementation creates a professional 2-page landscape PDF with a 4-column layout (Vision page) and 3-column layout (Traction page). The code includes text wrapping via `doc.splitTextToSize()`, but there are potential issues with text overflow when content exceeds the allocated box heights.

---

## 1. Library Information

### jsPDF Version and Loading

```html
<!-- Line 7 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```

**Library access pattern:**
```javascript
// Line 1244
const { jsPDF } = window.jspdf;
```

### Document Initialization

```javascript
// Lines 1257-1261
const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [pageWidth, pageHeight]
});
```

**Format options:**
- Letter: 279.4mm x 215.9mm (11" x 8.5")
- iPad 11": 241.3mm x 177.8mm (9.5" x 7")

---

## 2. Page Layout Structure

### Layout Constants

```javascript
// Lines 1263-1276
const margin = 10;
const contentWidth = pageWidth - (margin * 2);
const headerHeight = 18;
const cornerRadius = 3;

// Color Palette
const deepRed = [139, 38, 5];     // #8b2605 - Primary headers
const darkBrown = [49, 41, 38];   // #312926 - Accents
const white = [255, 255, 255];
const offWhite = [250, 250, 252]; // Backgrounds
const textDark = [31, 41, 55];    // Body text
const textMuted = [107, 114, 128]; // Labels
const borderLight = [209, 213, 219]; // Borders
```

### Column Layout (Vision Page)

```javascript
// Lines 1469-1475
const colGap = 4;
const colWidth = (contentWidth - (colGap * 3)) / 4;

// Column positions
const col1X = margin;
const col2X = margin + colWidth + colGap;
const col3X = margin + (colWidth + colGap) * 2;
const col4X = margin + (colWidth + colGap) * 3;
```

### Column Layout (Traction Page)

```javascript
// Lines 1585-1589
const tColGap = 4;
const tColWidth = (contentWidth - (tColGap * 2)) / 3;
const tCol1X = margin;
const tCol2X = margin + tColWidth + tColGap;
const tCol3X = margin + (tColWidth + tColGap) * 2;
```

---

## 3. Section Drawing Implementation

### drawModernSection Function

This is the core function for drawing section boxes with headers.

```javascript
// Lines 1291-1320
function drawModernSection(title, x, y, width, height, opts = {}) {
    const headerH = opts.headerHeight || 7;
    const showDarkAccent = opts.darkAccent !== false;

    // Section container with subtle border
    doc.setFillColor(...white);
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.3);
    roundedRect(x, y, width, height, cornerRadius, 'FD');

    // Header background (red header bar)
    doc.setFillColor(...deepRed);
    doc.roundedRect(x, y, width, headerH, cornerRadius, cornerRadius, 'F');
    // Fill bottom part of header to make square bottom
    doc.rect(x, y + cornerRadius, width, headerH - cornerRadius, 'F');

    // Gold accent line under header
    if (showDarkAccent) {
        doc.setFillColor(...darkBrown);
        doc.rect(x, y + headerH, width, 0.8, 'F');
    }

    // Header text
    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(toAscii(title.toUpperCase()), x + 4, y + headerH - 2);

    return y + headerH + (showDarkAccent ? 3.5 : 2.5);
}
```

**Returns:** Y position where content should start (after header)

**Key observation:** The function takes a `height` parameter but does NOT enforce it for content - the box is drawn at the specified height, but content can overflow.

---

## 4. Text Rendering Approach

### drawText Function

```javascript
// Lines 1324-1330
function drawText(text, x, y, maxWidth, fontSize = 8, isBold = false, color = textDark) {
    doc.setTextColor(...color);
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(toAscii(text || ''), maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * (fontSize * 0.42));
}
```

**Text wrapping mechanism:**
- Uses `doc.splitTextToSize(text, maxWidth)` to wrap text
- Line height calculation: `fontSize * 0.42` (approximate)
- Returns new Y position after text

**CRITICAL ISSUE:** This function does NOT check if the resulting Y position exceeds the box boundary. Text can overflow into adjacent sections.

### drawLabel Function

```javascript
// Lines 1333-1339
function drawLabel(text, x, y, useDark = false) {
    doc.setTextColor(...(useDark ? darkBrown : textMuted));
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(toAscii(text.toUpperCase()), x, y);
    return y + 3.5;
}
```

**No wrapping** - labels are expected to be short.

---

## 5. List Rendering Implementation

### drawList Function

```javascript
// Lines 1342-1370
function drawList(items, x, y, maxWidth, numbered = false, lineHeight = 3.2) {
    doc.setTextColor(...textDark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    let currentY = y;
    const filtered = (items || []).filter(item => item && String(item).trim());
    filtered.forEach((item, index) => {
        if (numbered) {
            // Draw number with dark accent
            doc.setTextColor(...darkBrown);
            doc.setFont('helvetica', 'bold');
            doc.text(`${index + 1}.`, x, currentY);
            doc.setTextColor(...textDark);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(toAscii(item), maxWidth - 6);
            doc.text(lines, x + 6, currentY);
            currentY += lines.length * lineHeight;
        } else {
            // Modern bullet point
            doc.setFillColor(...darkBrown);
            doc.circle(x + 1, currentY - 1, 0.6, 'F');
            doc.setTextColor(...textDark);
            const lines = doc.splitTextToSize(toAscii(item), maxWidth - 5);
            doc.text(lines, x + 5, currentY);
            currentY += lines.length * lineHeight;
        }
    });
    return currentY;
}
```

**Features:**
- Filters empty items before rendering
- Supports numbered and bulleted lists
- Uses `splitTextToSize` for wrapping each item
- Line height: 3.2mm default

**CRITICAL ISSUE:** No boundary checking. Lists can overflow their section boxes.

---

## 6. Section Height Calculations

### Current Height Calculation Pattern

Heights are calculated based on content count, but these are estimates:

```javascript
// Core Values (Lines 1481-1483)
const cvItems = (vtoData.coreValues || []).filter(v => v && v.trim());
const cvHeight = Math.max(30, cvItems.length * 3.5 + 14);

// Target Market (Lines 1553-1554)
const tmItems = (vtoData.targetMarket || []).filter(t => t && t.trim());
const tmHeight = Math.max(35, tmItems.length * 3.5 + 16);

// Three Uniques (Lines 1561-1562)
const tuItems = (vtoData.threeUniques || []).filter(t => t && t.trim());
const tuHeight = Math.max(35, tuItems.length * 3.5 + 12);
```

**Height formula:** `items.length * 3.5 + padding`

**Problem:** This assumes each item is a single line. Multi-line wrapped text is NOT accounted for.

### Fixed Height Sections

Some sections use available space:

```javascript
// 10-Year Target (Line 1508)
const tenHeight = availHeight - (cvHeight + cfHeight + 6);

// 3-Year Picture (Line 1522)
const threeHeight = availHeight;

// Issues List (Line 1700)
const issuesHeight = availHeight;
```

---

## 7. Complex Content Rendering (Rocks and Issues)

### Rocks Rendering (Lines 1669-1695)

```javascript
rocksFiltered.forEach((rock, index) => {
    // Rock number
    doc.setTextColor(...darkBrown);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}.`, tCol2X + 4, qrY);

    // Rock text (WRAPPED)
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'normal');
    const rockLines = doc.splitTextToSize(toAscii(rock.text), tColWidth - 40);
    doc.text(rockLines, tCol2X + 10, qrY);

    // Owner badge (right-aligned)
    if (rock.owner) {
        doc.setFillColor(...deepRed);
        const ownerText = toAscii(rock.owner);
        const ownerWidth = doc.getTextWidth(ownerText) + 4;
        roundedRect(tCol2X + tColWidth - ownerWidth - 4, qrY - 3, ownerWidth, 5, 1, 'F');
        doc.setTextColor(...white);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text(ownerText, tCol2X + tColWidth - 6, qrY, { align: 'right' });
    }

    qrY += rockLines.length * 3.2 + 2;
});
```

**Text width for rocks:** `tColWidth - 40` (40mm reserved for number + owner badge)

### Issues Rendering (Lines 1704-1748)

```javascript
issuesFiltered.forEach((issue, index) => {
    // Issue number
    doc.text(`${index + 1}.`, tCol3X + 4, issY);

    // Issue text (WRAPPED)
    const issueLines = doc.splitTextToSize(toAscii(issue.text), tColWidth - 35);
    doc.text(issueLines, tCol3X + 10, issY);

    // Status badge
    if (issue.status) {
        // ... badge rendering with colors based on status
    }

    issY += issueLines.length * 3.2 + 2;
});
```

**Text width for issues:** `tColWidth - 35` (35mm reserved for number + status badge)

---

## 8. Unicode to ASCII Conversion

```javascript
// Lines 1134-1151
function toAscii(text) {
    if (!text) return '';
    return text
        // Smart quotes
        .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
        // Dashes
        .replace(/[\u2013\u2014]/g, '-')
        // Ellipsis
        .replace(/\u2026/g, '...')
        // Other common replacements
        .replace(/\u00A0/g, ' ')  // Non-breaking space
        .replace(/\u00AB/g, '<<')
        .replace(/\u00BB/g, '>>')
        .replace(/\u2022/g, '-')  // Bullet
        .replace(/\u00B7/g, '-')  // Middle dot
        .replace(/\u2019/g, "'"); // Right single quote
}
```

**Purpose:** jsPDF with default fonts (Helvetica) doesn't support Unicode. This function converts special characters to ASCII equivalents.

---

## 9. Key Findings Summary

### What Works Well

1. **Text wrapping EXISTS** via `doc.splitTextToSize()`
2. **Professional design** with rounded corners, color-coded sections
3. **Dynamic list rendering** with proper filtering of empty items
4. **Multi-format support** (Letter and iPad sizes)

### Critical Issues

| Issue | Location | Impact |
|-------|----------|--------|
| **No overflow protection** | All drawText/drawList calls | Text can overflow section boundaries |
| **Height estimates ignore wrapping** | Lines 1481-1562 | Section heights based on item count, not actual text height |
| **No truncation or pagination** | Entire exportPDF function | Long content spills into adjacent sections |

### Missing Features

1. **Boundary-aware text rendering** - Stop rendering when Y exceeds section bottom
2. **Text truncation with ellipsis** - Indicate when content is cut off
3. **Dynamic section resizing** - Expand sections based on actual content height
4. **Content overflow indicators** - Visual cue that content was truncated

---

## 10. Recommended Fix Approach

### Option A: Add Boundary Checking to Existing Functions

Modify `drawText` and `drawList` to accept a `maxY` parameter and stop rendering when reached.

```javascript
// Proposed signature
function drawText(text, x, y, maxWidth, maxY, fontSize = 8, isBold = false, color = textDark) {
    // ... existing setup ...
    const lines = doc.splitTextToSize(toAscii(text || ''), maxWidth);
    let currentY = y;
    for (const line of lines) {
        if (currentY > maxY) break; // Stop before overflow
        doc.text(line, x, currentY);
        currentY += fontSize * 0.42;
    }
    return currentY;
}
```

### Option B: Pre-calculate Required Heights

Before drawing, calculate exact heights needed for all sections, then adjust layout accordingly.

### Option C: Clipping Regions (jsPDF Advanced)

Use `doc.save()`, set clipping path, render content, `doc.restore()` - but this hides overflow rather than preventing it.

---

## 11. File Reference

- **Full file path:** `/Users/eddiesanjuan/projects/vto-builder/index.html`
- **PDF export function:** Lines 1239-1756
- **Key helper functions:**
  - `drawModernSection`: Lines 1291-1320
  - `drawText`: Lines 1324-1330
  - `drawLabel`: Lines 1333-1339
  - `drawList`: Lines 1342-1370
  - `drawMetric`: Lines 1373-1389
  - `toAscii`: Lines 1134-1151

---

## Fleet Feedback

**FRICTION:** The code is well-organized but all in a single HTML file (1772 lines). Separating PDF generation into its own module would make auditing and maintenance easier.

**MISSING_CONTEXT:** No specification document describing expected behavior when content exceeds section bounds. Is truncation acceptable? Should sections expand?

**SUGGESTION:** Future development should include:
1. Unit tests for PDF generation with various content lengths
2. A design spec showing expected behavior for overflow scenarios
3. Consider moving PDF generation to a separate JS file for maintainability
