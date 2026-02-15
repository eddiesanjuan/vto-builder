Analyze and optimize performance in the VTO Builder (`index.html`, ~2,037 lines, single-file vanilla JS app).

This is a client-side-only application with no build step, no framework, and no bundler. Performance concerns are DOM manipulation efficiency, PDF generation speed, and localStorage throughput -- NOT network requests or server response times.

## 1. DOM Manipulation Audit

### List Re-rendering (lines 825-895)

The three render functions wipe and rebuild their entire container on every change:

- `renderList()` (line 825): `container.innerHTML = ''` then rebuilds all items
- `renderRocksList()` (line 846): `container.innerHTML = ''` then rebuilds all items
- `renderIssuesList()` (line 870): `container.innerHTML = ''` then rebuilds all items

**Check**: When a user adds item N+1, all N existing items are destroyed and recreated. This causes:
- Loss of focus/cursor position (mitigated by the `focus()` call in `addListItem()` at line 903)
- Unnecessary DOM thrashing for large lists

**Measure**: How many list items exist in a typical VTO? Check `efsj-prefill.json` for real data sizes (core values: ~4, rocks: ~7, issues: ~10). At these sizes, full re-render is acceptable. Flag if any list exceeds 20 items.

**Optimization if needed**: Replace `innerHTML = ''` + rebuild with targeted DOM updates (insert/remove single nodes). Only worth it if lists regularly exceed 15-20 items.

### Input Event Listener (lines 2024-2027)

```javascript
document.addEventListener('input', () => {
    collectFormData();
});
```

This fires `collectFormData()` on EVERY keystroke across ALL inputs. `collectFormData()` (lines 958-980) reads 20+ `document.getElementById()` calls each time.

**Check**: Is this causing jank on slower devices? The function is lightweight (just reading `.value` properties), but it runs on every keystroke.

**Optimization if needed**: Debounce with a 300ms delay:
```javascript
let collectTimeout;
document.addEventListener('input', () => {
    clearTimeout(collectTimeout);
    collectTimeout = setTimeout(collectFormData, 300);
});
```

Note: This does NOT save to localStorage (that is intentional per CLAUDE.md gotcha #5). It only syncs the in-memory `vtoData` object.

## 2. Layout Reflow Analysis

### CSS Custom Properties (lines 15-30)

The `:root` custom properties are clean and do not cause reflow issues. Verify no JavaScript dynamically modifies CSS custom properties at runtime.

### Sticky Header (lines 41-49)

The `<header>` uses `position: sticky; top: 0; z-index: 100;`. This is fine for modern browsers but check:
- Does scrolling the form cause paint events on the header? (It should not with `will-change: transform` or similar, but this app does not use it.)
- The header has `box-shadow: var(--shadow)` which is repainted on scroll in some browsers.

### Tab Switching (lines 794-802)

Tab switching uses `classList.remove('active')` on all tabs and contents, then `classList.add('active')` on the selected one. This triggers a style recalculation but only touches 2 elements (Vision and Traction tabs). Acceptable.

## 3. PDF Generation Speed

The `exportPDF()` function (lines 1239-2022) is ~780 lines and the most CPU-intensive operation in the app.

### Bottlenecks to check:

1. **Text measurement loops**: `measureListHeight()` and `measureTextHeight()` call `doc.getTextWidth()` repeatedly for word wrapping. Each call triggers jsPDF's internal font metrics lookup. Count how many times these are called per export.

2. **Redundant `doc.setFont()` and `doc.setFontSize()` calls**: The PDF helpers (`drawText`, `drawList`, `drawLabel`, `drawModernSection`) each set font properties. If called sequentially with the same settings, these are wasted calls.

3. **`toAscii()` processing** (lines 1134-1151): Called on every text string going into the PDF. Uses 10 regex replacements per call. For a VTO with ~50 text strings, that is ~500 regex operations. This is fast but could be batched.

4. **Revenue Diamond rendering** (`drawRevenueDiamond()`): Uses multiple `doc.triangle()` and `doc.lines()` calls. Check if the diamond is drawn even when revenue/profit values are empty.

### Measurement approach:

Wrap the `exportPDF()` call in timing:
```javascript
const t0 = performance.now();
exportPDF();
const t1 = performance.now();
console.log(`PDF generated in ${(t1 - t0).toFixed(0)}ms`);
```

Target: Under 500ms for a fully populated VTO on a modern machine. Flag if over 1000ms.

## 4. Image / Base64 Handling

This app currently has NO embedded images or logos in the PDF. The header uses pure text ("E.F. SAN JUAN") and geometric shapes (the red diamond). If logos are added in the future:
- Base64-encoded images should be defined as constants, not re-encoded on each export
- Image dimensions should be pre-calculated, not measured at render time
- Large images (>100KB base64) will significantly slow PDF generation

**Check**: Search for any `data:image`, `toDataURL`, or `btoa` calls in the codebase. If none exist, note that the app is currently image-free (good for performance).

## 5. localStorage Efficiency

### Current usage:
- **Save** (line 1102): `localStorage.setItem('vtoData', JSON.stringify(vtoData))` -- serializes the entire data model on every save
- **Load** (line 1108): `localStorage.getItem('vtoData')` + `JSON.parse()` -- deserializes on page load
- **Clear** (line 1204): `localStorage.removeItem('vtoData')` -- single key removal

### Check:
- What is the typical size of the serialized `vtoData`? Import `efsj-prefill.json`, call `JSON.stringify(vtoData)`, check `.length`. A typical VTO should be under 5KB.
- localStorage has a ~5MB limit per origin. A single VTO is well within this, but flag if multi-VTO support is ever added.
- `JSON.parse()` on page load (line 1111) runs synchronously and blocks rendering. At <5KB this is sub-millisecond, but note it for future awareness.

### Optimization if needed:
- For multi-VTO support: use IndexedDB instead of localStorage
- For large VTOs: consider compressing with `LZString` before storage

## 6. Performance Report

Summarize findings as:

```
PERFORMANCE AUDIT: VTO Builder v2.0.0

CRITICAL (fix now):
- [any issues causing user-visible jank or >1s delays]

MODERATE (fix when convenient):
- [issues that matter at scale or on slow devices]

LOW (nice-to-have):
- [micro-optimizations not worth the code complexity]

METRICS:
- PDF generation time: [measured or estimated]
- localStorage payload size: [measured]
- List re-render cost: [acceptable / needs optimization]
- Input event frequency: [acceptable / needs debounce]
```
