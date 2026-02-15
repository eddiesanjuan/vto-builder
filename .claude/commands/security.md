Run a security audit on the VTO Builder (`index.html`, ~2,037 lines, client-side-only vanilla JS app).

This application runs entirely in the browser. There is no server, no API, no authentication, and no database. The threat model is: a user opens this HTML file, enters business data, and exports a PDF. Attacks target the user's browser via crafted input or compromised dependencies.

## 1. XSS via innerHTML

### Current innerHTML Usage

Three list render functions use `innerHTML` to build form elements:

- `renderList()` (line 832): `div.innerHTML = \`...\${escapeHtml(item)}...\``
- `renderRocksList()` (line 853): `div.innerHTML = \`...\${escapeHtml(rock.text)}...\${escapeHtml(rock.owner)}...\``
- `renderIssuesList()` (line 878): `div.innerHTML = \`...\${escapeHtml(issue.text)}...\``

### escapeHtml Implementation (lines 1219-1223)

```javascript
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
```

This is the correct DOM-based escaping approach. Verify:
- [ ] `escapeHtml()` is called on EVERY user-supplied value inserted into `innerHTML`
- [ ] No raw user input is concatenated into `innerHTML` without `escapeHtml()`
- [ ] The `escapeHtml()` function handles `null`, `undefined`, and non-string inputs (the `|| ''` fallback covers null/undefined, but what about numbers or objects?)

### Inline Event Handlers

The `innerHTML` templates include inline event handlers like:
```javascript
onchange="updateListItem('${dataKey}', ${index}, this.value)"
onclick="removeListItem('${dataKey}', ${index}, '${containerId}')"
```

**Check**: Can a crafted `dataKey` or `containerId` break out of the string context? These values come from hardcoded JavaScript strings (e.g., `'coreValues'`, `'coreValuesList'`), NOT from user input. Verify that no user-controlled value is ever used as a `dataKey` or `containerId`.

### CLAUDE.md Gotcha #6

CLAUDE.md explicitly notes: "While `escapeHtml()` is applied, switching to `document.createElement()` for all user-content rendering would be safer long-term." Flag this as a known improvement area. The current pattern (createElement for the wrapper div, innerHTML for the template inside it) is a hybrid approach.

## 2. localStorage Data Handling

### Data Storage (lines 1098-1121)

- **Save**: `localStorage.setItem('vtoData', JSON.stringify(vtoData))` (line 1102)
- **Load**: `JSON.parse(localStorage.getItem('vtoData'))` (lines 1108-1111)

### Risks:
1. **No validation on load**: The loaded data passes through `normalizeData()` (line 1112) which applies type defaults, but does it sanitize string content? Check `normalizeData()` (lines 1056-1096) -- it checks types (string vs array) but does NOT strip HTML or script tags from string values. If localStorage is tampered with (e.g., via browser devtools or XSS on the same origin), malicious HTML could be stored and later rendered via `innerHTML`.

2. **Same-origin access**: Any script running on the same origin can read/write this localStorage key. If the app is hosted on a shared domain (e.g., GitHub Pages under `username.github.io`), other projects on that origin could access VTO data.

3. **No encryption**: Business-sensitive data (revenue targets, strategic plans, issues) is stored in plaintext. For a local tool this is acceptable, but flag for awareness.

### Mitigation check:
- Verify that `populateForm()` (lines 1030-1053) sets `.value` on input elements (safe -- `.value` does not execute HTML)
- Verify that list data passes through `escapeHtml()` before going into `innerHTML` during `renderList()`/`renderRocksList()`/`renderIssuesList()` -- YES, it does

## 3. CDN Integrity (Subresource Integrity)

### Current state (line 7):

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```

**Missing**: No `integrity` attribute and no `crossorigin` attribute.

This means:
- If cdnjs is compromised or serves a tampered file, the app will execute it
- There is no way to verify the script matches its expected hash

### Recommended fix:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        integrity="sha512-[HASH]"
        crossorigin="anonymous"
        referrerpolicy="no-referrer"></script>
```

To generate the hash:
```bash
curl -s https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js | openssl dgst -sha512 -binary | openssl base64 -A
```

Then format as `integrity="sha512-[base64hash]"`.

**Severity**: MEDIUM. The app handles business-sensitive data. A compromised CDN could exfiltrate all form inputs.

## 4. Form Input Sanitization

### JSON Import (lines 1172-1190)

The `importJSON()` function parses any JSON file the user selects:

```javascript
const parsed = JSON.parse(e.target.result);
vtoData = normalizeData(parsed);
populateForm();
```

**Check**:
- Does `normalizeData()` reject unexpected keys? Check line 1060: `for (const key in defaults)` -- it only copies known keys from `getDefaultData()`. Unknown keys in the import are silently dropped. This is GOOD.
- Does `normalizeData()` validate string lengths? NO -- a crafted JSON with extremely long strings (megabytes) could cause performance issues or memory exhaustion.
- Does `normalizeData()` validate array lengths? NO -- a crafted JSON with thousands of array items could cause rendering issues.

### Filename Sanitization (lines 1124-1131)

```javascript
function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '-').substring(0, 50).replace(/-+$/, '') || 'export';
}
```

This is used for PDF filenames (line 2019). Verify:
- [ ] Strips all special characters (yes -- allowlist approach)
- [ ] Limits length (yes -- 50 chars)
- [ ] Provides fallback (yes -- `'export'`)
- [ ] No path traversal possible (yes -- no `/` or `\` allowed)

## 5. Data Leakage in Exported PDFs

### What goes into the PDF:

The `exportPDF()` function (lines 1239-2022) writes all VTO data into the PDF:
- Company name, revenue targets, profit targets
- Strategic plans, core values, issues
- Rock assignments with owner names
- Date information

### Check:
- Does jsPDF embed any metadata beyond what is explicitly written? Check for `doc.setProperties()` or `doc.setDocumentProperties()` calls. If absent, jsPDF adds default metadata (Creator: "jsPDF", Producer: "jsPDF").
- The PDF filename includes the company name (line 2019-2020): `VTO-${safeName}-${date}.pdf`. This reveals the company name in the filename, which is expected and intentional.
- No hidden fields, comments, or invisible text layers are added.

### Recommendation:
Consider setting explicit PDF metadata to control what is visible in document properties:
```javascript
doc.setProperties({
    title: `VTO - ${vtoData.companyName}`,
    creator: 'VTO Builder',
    subject: 'Vision/Traction Organizer'
});
```

## 6. Security Report

Summarize findings as:

```
SECURITY AUDIT: VTO Builder v2.0.0

CRITICAL (fix before deployment):
- [any XSS, injection, or data exposure vulnerabilities]

HIGH (fix soon):
- [missing SRI, unsafe patterns that could be exploited]

MEDIUM (fix when convenient):
- [defense-in-depth improvements]

LOW (acceptable risk):
- [theoretical risks with minimal real-world impact for this use case]

RECOMMENDATIONS:
1. [Specific code change with line numbers]
2. [Specific code change with line numbers]
...
```
