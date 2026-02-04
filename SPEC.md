# VTO Builder Spec

Simple web app to create and export EOS Vision/Traction Organizer documents.

## Requirements

1. **Single-page web app** - No build step needed, runs from index.html
2. **Form-based input** for all VTO sections
3. **Professional PDF export** matching EOS formatting
4. **Save/Load** - localStorage + JSON file export/import
5. **Clean, intuitive UI** - Non-technical managers will use this

## VTO Structure (from EOS)

### Page 1 - Vision
- **Core Values** (list of 4-6 values)
- **Core Focus** (tagline/purpose statement)
- **Core Target** (long-term target with date)
- **3-Year Picture**
  - Future Date
  - Revenue target
  - Profit target (% or $)
  - "What does it look like?" bullet points
- **Marketing Strategy**
  - Target Market (Demo, Geo, Psycho)
  - Three Uniques
  - Proven Process (text or reference)
  - Guarantee

### Page 2 - Traction
- **1-Year Plan**
  - Future Date
  - Revenue
  - Profit
  - Goals for the Year (numbered list)
  - Theme
- **Quarterly Rocks**
  - Future Date
  - Revenue (optional)
  - Profit (optional)
  - Rocks with Owner assignment
  - Theme
- **Issues List** (Parking Lot)
  - Numbered issues
  - Optional status: blank, IN PROGRESS, DONE, NEED

## Tech Stack

- HTML + CSS + vanilla JS (no framework needed)
- jsPDF for PDF generation
- Clean, modern styling (Tailwind via CDN is fine)

## PDF Output

- Two pages, matching EOS VTO layout
- Company logo placeholder
- Professional typography
- Print-friendly

## Example Data

Core Values:
1. Act like an owner
2. It's all in the details
3. Guided by the Golden Rule
4. We are Family

Core Focus: "Plan perfection, deliver excellence"

See attached PDFs for full example structure.
