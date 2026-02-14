Add a new field to the VTO Builder. The user will describe what field they want added.

Follow this checklist precisely -- every step is required for the field to work end-to-end:

## 1. Data Model

In `index.html`, find the `getDefaultData()` function (around line 759). Add the new field with an appropriate default value:
- Use `''` for text fields
- Use `[]` for list fields
- Use `[{ text: '', owner: '' }]` or similar for structured list fields

## 2. HTML Form Element

Add the form input in the appropriate tab section:
- Vision tab fields go inside `<div id="vision" class="tab-content">`
- Traction tab fields go inside `<div id="traction" class="tab-content">`

Follow the existing pattern:
```html
<div class="section">
    <div class="section-header">
        <div>
            <h2 class="section-title">Field Name</h2>
            <p class="section-subtitle">Description for the user</p>
        </div>
    </div>
    <!-- input/textarea/list here -->
</div>
```

For list fields, use `addListItem('containerIdList', 'dataKey')` pattern.

## 3. Data Collection

Add the field to `collectFormData()` (around line 958):
```javascript
vtoData.fieldName = document.getElementById('fieldName').value;
```

For list fields, also add to `collectListsFromDOM()` (around line 983).

## 4. Form Population

Add the field to `populateForm()` (around line 1030):
```javascript
document.getElementById('fieldName').value = vtoData.fieldName || '';
```

## 5. Import Normalization

Add handling in `normalizeData()` (around line 1056) -- the existing logic handles strings and arrays automatically, but verify structured arrays (like rocks/issues) get special treatment if needed.

## 6. PDF Rendering

Add the field to the `exportPDF()` function in the appropriate column:
- Page 1 (Vision): 4 columns -- Core Values+Focus+10yr | 3-Year Picture | Marketing | Guarantee
- Page 2 (Traction): 3 columns -- 1-Year Plan | Rocks | Issues

Use the existing helper functions:
- `drawModernSection(title, x, y, width, height)` for section boxes
- `drawText(text, x, y, maxWidth, fontSize, bold, color, maxY)` for text
- `drawList(items, x, y, maxWidth, numbered, lineHeight, maxY)` for lists
- `measureListHeight()` / `measureTextHeight()` for dynamic sizing
- Always pass `maxY` for overflow protection

## 7. Update Prefill Templates

Add the new field to both:
- `efsj-prefill.json` with real or placeholder data
- `backend-ops-prefill.json` with department-appropriate data

## 8. Test

1. Open `index.html` in a browser
2. Verify the new field appears in the correct tab
3. Fill in data, export PDF, verify it renders correctly
4. Import a prefill JSON, verify the field populates
5. Save to localStorage, reload, verify persistence
6. Test with long text to verify overflow protection in PDF

## 9. Version Bump

Increment the MINOR version in the header (line 458):
```html
<small style="...">v2.X.0</small>
```
