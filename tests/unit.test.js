/**
 * VTO Builder Unit Tests
 *
 * Tests pure functions extracted from index.html.
 * Run with: node --test tests/unit.test.js
 * Requires Node.js 18+ (built-in test runner, no dependencies).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Extract JS from index.html and eval it in a mock DOM context
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('No <script> tag found in index.html');

// We can't run the full script (needs DOM), but we can extract and test
// individual pure functions by wrapping them.

// ── Helper: extract a named function from the script source ──
function extractFunction(name, src) {
  // Match standalone function declarations
  const regex = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`, 'g');
  const match = regex.exec(src);
  if (!match) return null;

  let braceCount = 0;
  let start = match.index;
  let i = match.index + match[0].length - 1; // position of opening brace
  for (; i < src.length; i++) {
    if (src[i] === '{') braceCount++;
    else if (src[i] === '}') {
      braceCount--;
      if (braceCount === 0) break;
    }
  }
  return src.substring(start, i + 1);
}

// Extract pure functions we can test without a DOM
const scriptSrc = scriptMatch[1];

// ── getDefaultData ──
const getDefaultDataSrc = extractFunction('getDefaultData', scriptSrc);
const getDefaultData = new Function(`${getDefaultDataSrc}; return getDefaultData;`)();

// ── sanitizeFilename ──
const sanitizeFilenameSrc = extractFunction('sanitizeFilename', scriptSrc);
const sanitizeFilename = new Function(`${sanitizeFilenameSrc}; return sanitizeFilename;`)();

// ── toAscii ──
const toAsciiSrc = extractFunction('toAscii', scriptSrc);
const toAscii = new Function(`${toAsciiSrc}; return toAscii;`)();

// ── formatDate ──
const formatDateSrc = extractFunction('formatDate', scriptSrc);
const formatDate = new Function(`${formatDateSrc}; return formatDate;`)();

// ── normalizeData ── (depends on getDefaultData and constants)
const normalizeBlock = `
  const MAX_LIST_ITEMS = 100;
  const MAX_STRING_LENGTH = 10000;
  ${getDefaultDataSrc}
  ${extractFunction('normalizeData', scriptSrc)}
  return normalizeData;
`;
const normalizeData = new Function(normalizeBlock)();

// ── escapeHtml ── (needs a minimal DOM mock)
// We'll test this with a simple implementation check instead

// ===================== TESTS =====================

describe('getDefaultData', () => {
  it('returns an object with all expected fields', () => {
    const data = getDefaultData();
    assert.equal(typeof data.companyName, 'string');
    assert.equal(typeof data.vtoDate, 'string');
    assert.equal(typeof data.quarter, 'string');
    assert.ok(Array.isArray(data.coreValues));
    assert.ok(Array.isArray(data.threeYearBullets));
    assert.ok(Array.isArray(data.targetMarket));
    assert.ok(Array.isArray(data.threeUniques));
    assert.ok(Array.isArray(data.oneYearGoals));
    assert.ok(Array.isArray(data.rocks));
    assert.ok(Array.isArray(data.issues));
  });

  it('returns empty strings for all text fields', () => {
    const data = getDefaultData();
    const textFields = [
      'companyName', 'vtoDate', 'quarter', 'theBar', 'purpose', 'niche',
      'tenYearDate', 'tenYearTarget', 'threeYearDate', 'threeYearRevenue',
      'threeYearProfit', 'provenProcess', 'guarantee', 'oneYearDate',
      'oneYearRevenue', 'oneYearProfit', 'oneYearTheme', 'rocksDate',
      'rocksRevenue', 'rocksProfit', 'rocksTheme'
    ];
    for (const field of textFields) {
      assert.equal(data[field], '', `${field} should be empty string`);
    }
  });

  it('returns empty arrays for all list fields', () => {
    const data = getDefaultData();
    assert.deepEqual(data.coreValues, []);
    assert.deepEqual(data.rocks, []);
    assert.deepEqual(data.issues, []);
  });

  it('returns a new object each time (no shared references)', () => {
    const a = getDefaultData();
    const b = getDefaultData();
    assert.notEqual(a, b);
    a.companyName = 'modified';
    assert.equal(b.companyName, '');
  });
});

describe('sanitizeFilename', () => {
  it('returns "export" for empty/null input', () => {
    assert.equal(sanitizeFilename(''), 'export');
    assert.equal(sanitizeFilename(null), 'export');
    assert.equal(sanitizeFilename(undefined), 'export');
  });

  it('removes special characters', () => {
    assert.equal(sanitizeFilename('Company/Name'), 'CompanyName');
    assert.equal(sanitizeFilename('Test<>File'), 'TestFile');
    assert.equal(sanitizeFilename('A&B'), 'AB');
  });

  it('replaces spaces with hyphens', () => {
    assert.equal(sanitizeFilename('My Company Name'), 'My-Company-Name');
  });

  it('truncates to 50 characters', () => {
    const long = 'A'.repeat(100);
    assert.equal(sanitizeFilename(long).length, 50);
  });

  it('preserves hyphens and underscores', () => {
    assert.equal(sanitizeFilename('my-file_name'), 'my-file_name');
  });

  it('removes trailing hyphens', () => {
    assert.equal(sanitizeFilename('test---'), 'test');
  });
});

describe('toAscii', () => {
  it('returns empty string for falsy input', () => {
    assert.equal(toAscii(''), '');
    assert.equal(toAscii(null), '');
    assert.equal(toAscii(undefined), '');
  });

  it('converts smart single quotes to ASCII', () => {
    assert.equal(toAscii('\u2018hello\u2019'), "'hello'");
  });

  it('converts smart double quotes to ASCII', () => {
    assert.equal(toAscii('\u201Chello\u201D'), '"hello"');
  });

  it('converts em dash and en dash to hyphen', () => {
    assert.equal(toAscii('a\u2013b'), 'a-b');
    assert.equal(toAscii('a\u2014b'), 'a-b');
  });

  it('converts ellipsis to three dots', () => {
    assert.equal(toAscii('wait\u2026'), 'wait...');
  });

  it('converts non-breaking space to regular space', () => {
    assert.equal(toAscii('hello\u00A0world'), 'hello world');
  });

  it('converts registered trademark', () => {
    assert.equal(toAscii('Brand\u00AE'), 'Brand(R)');
  });

  it('converts trademark symbol', () => {
    assert.equal(toAscii('Product\u2122'), 'Product(TM)');
  });

  it('converts copyright symbol', () => {
    assert.equal(toAscii('\u00A9 2024'), '(c) 2024');
  });

  it('converts fractions', () => {
    assert.equal(toAscii('\u00BD'), '1/2');
    assert.equal(toAscii('\u00BC'), '1/4');
    assert.equal(toAscii('\u00BE'), '3/4');
  });

  it('converts measurement symbols (relevant for millwork)', () => {
    assert.equal(toAscii('6\u2032'), "6'");  // feet
    assert.equal(toAscii('3\u2033'), '3"');  // inches
    assert.equal(toAscii('90\u00B0'), '90deg');  // degrees
    assert.equal(toAscii('11\u00D78.5'), '11x8.5');  // multiplication
  });

  it('converts minus sign to hyphen', () => {
    assert.equal(toAscii('5\u2212'), '5-');
  });

  it('passes through plain ASCII unchanged', () => {
    assert.equal(toAscii('Hello World 123'), 'Hello World 123');
  });
});

describe('formatDate', () => {
  it('returns empty string for empty input', () => {
    assert.equal(formatDate(''), '');
    assert.equal(formatDate(null), '');
    assert.equal(formatDate(undefined), '');
  });

  it('formats a valid date string', () => {
    const result = formatDate('2025-01-15');
    assert.equal(result, 'January 15, 2025');
  });

  it('formats December 31 correctly (timezone edge case)', () => {
    const result = formatDate('2025-12-31');
    assert.equal(result, 'December 31, 2025');
  });

  it('formats January 1 correctly (timezone edge case)', () => {
    const result = formatDate('2025-01-01');
    assert.equal(result, 'January 1, 2025');
  });

  it('returns the input for non-dashed format', () => {
    assert.equal(formatDate('invalid'), 'invalid');
  });

  it('handles malformed YYYY-MM-DD gracefully', () => {
    // 'not-a-date' splits to 3 parts but parseInt produces NaN
    const result = formatDate('not-a-date');
    assert.equal(typeof result, 'string');
  });
});

describe('normalizeData', () => {
  it('returns defaults for empty object', () => {
    const result = normalizeData({});
    assert.equal(result.companyName, '');
    assert.deepEqual(result.coreValues, []);
    assert.deepEqual(result.rocks, []);
  });

  it('preserves valid string fields', () => {
    const result = normalizeData({ companyName: 'Test Corp' });
    assert.equal(result.companyName, 'Test Corp');
  });

  it('coerces non-string fields to strings', () => {
    const result = normalizeData({ companyName: 123 });
    assert.equal(result.companyName, '123');
  });

  it('preserves valid array fields', () => {
    const result = normalizeData({ coreValues: ['Integrity', 'Excellence'] });
    assert.deepEqual(result.coreValues, ['Integrity', 'Excellence']);
  });

  it('coerces non-string items in simple lists to strings', () => {
    const result = normalizeData({ coreValues: [123, null, 'valid'] });
    assert.deepEqual(result.coreValues, ['123', '', 'valid']);
  });

  it('caps arrays at MAX_LIST_ITEMS (100)', () => {
    const bigArray = Array(200).fill('item');
    const result = normalizeData({ coreValues: bigArray });
    assert.equal(result.coreValues.length, 100);
  });

  it('truncates strings at MAX_STRING_LENGTH (10000)', () => {
    const longString = 'x'.repeat(20000);
    const result = normalizeData({ companyName: longString });
    assert.equal(result.companyName.length, 10000);
  });

  it('ignores unknown fields', () => {
    const result = normalizeData({ unknownField: 'value' });
    assert.equal(result.unknownField, undefined);
  });

  it('normalizes rocks array items', () => {
    const result = normalizeData({
      rocks: [
        { text: 'Rock 1', owner: 'Alice' },
        { text: 'Rock 2' },
        'not an object'
      ]
    });
    assert.equal(result.rocks[0].text, 'Rock 1');
    assert.equal(result.rocks[0].owner, 'Alice');
    assert.equal(result.rocks[1].owner, '');
    assert.equal(result.rocks[2].text, '');
    assert.equal(result.rocks[2].owner, '');
  });

  it('normalizes issues array items', () => {
    const result = normalizeData({
      issues: [
        { text: 'Issue 1', status: 'DONE' },
        { text: 'Issue 2' }
      ]
    });
    assert.equal(result.issues[0].status, 'DONE');
    assert.equal(result.issues[1].status, '');
  });

  it('discards non-array values for array fields', () => {
    const result = normalizeData({ coreValues: 'not an array' });
    assert.deepEqual(result.coreValues, []);
  });

  it('uses Object.prototype.hasOwnProperty.call (prototype pollution safe)', () => {
    // Verify that __proto__ properties don't leak
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
    normalizeData(malicious);
    assert.equal({}.polluted, undefined);
  });
});

describe('HTML structure', () => {
  it('has Content-Security-Policy meta tag', () => {
    assert.ok(html.includes('Content-Security-Policy'));
  });

  it('CSP blocks network exfiltration (connect-src none)', () => {
    assert.ok(html.includes("connect-src 'none'"));
  });

  it('has SRI integrity attribute on jsPDF script', () => {
    assert.ok(html.includes('integrity="sha512-'));
  });

  it('has crossorigin attribute on jsPDF script', () => {
    assert.ok(html.includes('crossorigin="anonymous"'));
  });

  it('has ARIA role="tab" on tab elements', () => {
    assert.ok(html.includes('role="tab"'));
  });

  it('has tabindex on tab elements', () => {
    assert.ok(html.includes('tabindex="0"'));
  });

  it('has role="tablist" on tab container', () => {
    assert.ok(html.includes('role="tablist"'));
  });

  it('has no inline onclick/onchange in list renderers', () => {
    // The only onclick/onchange should be on non-list elements (buttons in header, add buttons)
    // List items should use addEventListener
    const scriptContent = scriptMatch[1];
    const renderListFn = scriptContent.match(/function renderList[\s\S]*?^        \}/m);
    if (renderListFn) {
      assert.ok(!renderListFn[0].includes('onclick='), 'renderList should not use inline onclick');
      assert.ok(!renderListFn[0].includes('onchange='), 'renderList should not use inline onchange');
    }
  });
});

describe('FIELD_IDS consistency', () => {
  it('FIELD_IDS matches getDefaultData keys (excluding arrays)', () => {
    const defaults = getDefaultData();
    const arrayFields = ['coreValues', 'threeYearBullets', 'targetMarket', 'threeUniques', 'oneYearGoals', 'rocks', 'issues'];

    // Extract FIELD_IDS from script
    const fieldIdsMatch = scriptSrc.match(/const FIELD_IDS\s*=\s*\[([\s\S]*?)\]/);
    assert.ok(fieldIdsMatch, 'FIELD_IDS should be defined');

    const fieldIds = fieldIdsMatch[1].match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));

    // Every FIELD_ID should be a key in defaults
    for (const id of fieldIds) {
      assert.ok(id in defaults, `FIELD_ID '${id}' should be in getDefaultData()`);
    }

    // Every non-array key in defaults should be in FIELD_IDS
    for (const key of Object.keys(defaults)) {
      if (!arrayFields.includes(key)) {
        assert.ok(fieldIds.includes(key), `getDefaultData key '${key}' should be in FIELD_IDS`);
      }
    }
  });
});

describe('Prefill JSON files', () => {
  it('efsj-prefill.json is valid and normalizable', () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'efsj-prefill.json'), 'utf8'));
    const normalized = normalizeData(data);
    assert.ok(normalized.companyName, 'Should have company name');
    assert.ok(normalized.coreValues.length > 0, 'Should have core values');
    assert.ok(normalized.rocks.length > 0, 'Should have rocks');
  });

  it('backend-ops-prefill.json is valid and normalizable', () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'backend-ops-prefill.json'), 'utf8'));
    const normalized = normalizeData(data);
    assert.ok(normalized.companyName, 'Should have company name');
  });
});
