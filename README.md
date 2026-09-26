# TikTok FBT → Amazon 4×6 Label Converter

A lightweight, client-side web application that converts TikTok FBT (Fulfilled by TikTok) duplicate-label PDFs into properly formatted Amazon-compatible 4×6 inch shipping label PDFs.

![TikTok Style](https://img.shields.io/badge/Theme-TikTok%20Style-25F4EE?style=flat-square)
![Client-Side](https://img.shields.io/badge/Processing-Client--Side-FE2C55?style=flat-square)
![No Backend](https://img.shields.io/badge/Backend-None-000000?style=flat-square)

## 🎯 Purpose

TikTok FBT generates shipping labels as PDFs with **duplicate labels stacked on each page** (typically 2 identical labels per page). Amazon's label printers expect **one label per 4×6 inch page**. This tool bridges that gap.

## ✨ Features

- **Drag & drop** PDF upload
- **Automatic detection** of label layout (vertical/horizontal, number of labels per page)
- **Configurable layout** — adjust if auto-detection doesn't match your PDF
- **High-quality rendering** at 3× scale to preserve barcode/QR readability
- **Exact 4×6 inch output** pages suitable for label printers
- **Client-side processing** — no data leaves your browser
- **Dark & light mode** with TikTok-inspired design
- **Preview** labels before downloading
- **No authentication, no database, no backend**

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📋 Usage

1. **Upload** your TikTok FBT PDF (drag & drop or click to browse)
   - **No test file?** Download a sample PDF using the buttons below the upload zone
   - Choose between 1-page (2 labels) or 3-page (6 labels) samples
2. **Review** the detected page count and label configuration
3. **Configure** layout if needed (labels per page, direction)
4. **Click** "Convert Labels"
5. **Preview** the output to verify barcode readability
6. **Download** the 4×6 PDF

### Sample PDFs

The app includes built-in sample PDF generators for testing:

- **1 Page (2 labels)** — Single page with 2 duplicate labels stacked vertically
- **3 Pages (6 labels)** — Three pages with 2 labels each (6 total)

These samples include:
- Realistic shipping label layout (FROM/TO addresses)
- Barcodes (Code 128 style)
- QR codes
- Order IDs and tracking numbers
- Weight and service information

Use these to verify the converter works correctly before processing your actual TikTok FBT PDFs.

## 🔧 Configuration

If labels appear cut off or misaligned, use the **Configure** button to adjust:

| Setting | Options | Default |
|---------|---------|---------|
| Labels per page | 1, 2, 3, 4 | 2 |
| Layout direction | Vertical (stacked), Horizontal (side-by-side) | Auto-detected |

### When to adjust:
- **1 label/page** — if source PDF has single full-page labels
- **2 labels/page** — standard TikTok FBT format (default)
- **3-4 labels/page** — if source has more labels per page
- **Horizontal** — if labels are arranged left-to-right instead of top-to-bottom

## 🏗️ Architecture

```
src/
├── App.tsx              # Main UI component (TikTok-themed)
├── index.css            # TikTok color system & animations
├── main.tsx             # Entry point
└── utils/
    └── pdfProcessor.ts  # PDF parsing, label extraction, output generation
```

### Key Libraries

| Library | Purpose |
|---------|---------|
| [pdf.js](https://mozilla.github.io/pdf.js/) | Parse and render source PDFs |
| [jsPDF](https://github.com/parallax/jsPDF) | Generate output 4×6 PDFs |
| [React](https://react.dev/) | UI framework |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |

### Processing Pipeline

```
Source PDF → pdf.js render (3× scale) → Canvas split → PNG data URLs → jsPDF 4×6 pages → Download
```

1. **Parse** — Read PDF page dimensions and count
2. **Detect** — Determine label layout from page geometry
3. **Render** — Each page rendered to high-res canvas (3× for barcode clarity)
4. **Split** — Canvas divided into individual labels based on config
5. **Generate** — Each label placed on its own 4×6 inch PDF page
6. **Output** — Aspect-ratio-preserving placement with centering

## 📐 Output Specifications

- **Page size:** Exactly 4 × 6 inches (288 × 432 points)
- **Orientation:** Portrait
- **Label placement:** Centered, aspect-ratio preserved
- **Image quality:** PNG at 3× render scale (preserves barcode scanning)
- **Format:** Standard PDF compatible with all label printers

## 🔒 Privacy

- **100% client-side** — All processing happens in your browser
- **No uploads** — PDFs never leave your device
- **No tracking** — No analytics, no cookies, no accounts
- **No backend** — Static files only, deployable anywhere

## 🧪 Testing Checklist

Test with real TikTok FBT PDFs:

- [ ] Single label per page
- [ ] Multiple labels per page (2, 3, 4)
- [ ] Multiple source pages
- [ ] Vertical layout (stacked)
- [ ] Horizontal layout (side-by-side)
- [ ] Barcode readability after conversion
- [ ] QR code readability after conversion
- [ ] Correct 4×6 inch page dimensions
- [ ] No missing or duplicated labels
- [ ] Malformed PDF handling (graceful error)

## 🎨 Theme

The UI uses TikTok's signature color palette:

| Color | Hex | Usage |
|-------|-----|-------|
| Cyan | `#25F4EE` | Primary accent, success states |
| Red/Pink | `#FE2C55` | Secondary accent, CTAs, errors |
| Black | `#000000` | Dark mode background |
| White | `#FFFFFF` | Light mode background |

Dark mode is the default (matching TikTok's aesthetic). Toggle between themes with the switch in the header.

## 📝 License

MIT

---

**Built for operational use.** Simple, reliable, no bloat.
