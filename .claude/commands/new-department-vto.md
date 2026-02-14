Create a new department-level VTO prefill template for E.F. San Juan.

The user will specify which department needs a VTO template. Use the existing templates as reference:
- `efsj-prefill.json` -- company-wide VTO (the "parent" VTO)
- `backend-ops-prefill.json` -- Back-End Operations department VTO

## Steps

### 1. Understand the Department

Ask the user (or infer from context):
- Department name
- Department manager name
- What the department does within E.F. San Juan
- Key operational metrics the department tracks

### 2. Create the Prefill JSON

Create a file named `{department-slug}-prefill.json` in the project root.

Follow this exact schema (matching `getDefaultData()` in index.html):

```json
{
  "companyName": "E.F. San Juan - {Department Name}",
  "vtoDate": "YYYY-MM-DD",
  "coreValues": [
    "Act like an owner",
    "It's all in the details",
    "Guided by the Golden Rule",
    "We are Family"
  ],
  "purpose": "{Department-specific purpose statement}",
  "niche": "Heritage Complex Custom Millwork",
  "tenYearDate": "2034-12-31",
  "tenYearTarget": "{Department's contribution to the company 10-year target}",
  "threeYearDate": "2028-12-31",
  "threeYearRevenue": "",
  "threeYearProfit": "",
  "threeYearBullets": [
    "{What does world-class look like for this department in 3 years?}"
  ],
  "targetMarket": [
    "{Who does this department serve? Internal and external customers}"
  ],
  "threeUniques": [
    "{What makes this department's approach unique?}"
  ],
  "provenProcess": "{Department's core workflow}",
  "guarantee": "Everything we make is guaranteed for life.",
  "oneYearDate": "2026-12-31",
  "oneYearRevenue": "",
  "oneYearProfit": "",
  "oneYearGoals": [
    "{Department goals for the year}"
  ],
  "oneYearTheme": "Solve...Sell...Save!",
  "rocksDate": "YYYY-MM-DD",
  "rocksRevenue": "",
  "rocksProfit": "",
  "rocks": [
    { "text": "{Rock description}", "owner": "{Owner name}" }
  ],
  "rocksTheme": "Solve...Sell...Save!",
  "issues": [
    { "text": "{Issue description}", "status": "" }
  ]
}
```

### Key Rules for Department VTOs

1. **Core Values are always the same** -- they come from the company level and do not change per department
2. **Niche stays the same** -- "Heritage Complex Custom Millwork"
3. **Guarantee stays the same** -- "Everything we make is guaranteed for life."
4. **Theme typically matches company** -- unless the department has its own
5. **Purpose/Core Focus should be department-specific** -- how does this department contribute to the company purpose?
6. **Use `[MANAGER INPUT NEEDED: ...]` placeholders** for fields that require manager decision-making
7. **Issues should be specific to the department** -- operational pain points, not company-wide strategic issues
8. **Rocks need owner names** -- use `[Owner]` placeholder if names aren't known

### 3. Validate the JSON

Ensure the file is valid JSON. Test by importing it into the VTO Builder:
1. Open `index.html`
2. Click "Clear" to reset
3. Click "Import JSON" and select the new file
4. Verify all fields populate correctly
5. Export PDF and verify layout

### 4. Commit

Commit the new template with message:
```
feat: add {Department Name} VTO prefill template
```
