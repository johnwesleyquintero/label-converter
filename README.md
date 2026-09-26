# TikTok FBT → Amazon 4×6 Label Converter

A lightweight, client-side web application that converts TikTok FBT (Fulfilled by TikTok) duplicate-page PDFs into Amazon AWD-compliant 4×6 inch shipping label PDFs.

![TikTok Style](https://img.shields.io/badge/Theme-TikTok%20Style-25F4EE?style=flat-square)
![Client-Side](https://img.shields.io/badge/Processing-Client--Side-FE2C55?style=flat-square)
![No Backend](https://img.shields.io/badge/Backend-None-000000?style=flat-square)

## 🎯 The Problem We Solve

### TikTok FBT Issues

1. **Duplicate Carton Labels:** TikTok provides 2 identical labels per carton (intended for placement on both sides of the box), but Amazon AWD's scanning system only accepts **one label per carton**.

2. **Incorrect Formatting and Sizing:** Manually removing the extra duplicate pages causes the document format to alter, making the labels larger than the required **4×6 inch format**, which Amazon rejects.

### Old Manual Workaround (Before This Tool)

1. Open the downloaded TikTok carton label PDF
2. Go to `File > Print`
3. Manually deselect every second duplicate page
4. Save/print the trimmed pages into a new PDF
5. Open ChatGPT, upload the trimmed PDF
6. Ask ChatGPT to resize all labels to 4×6 inches
7. Download the resized PDF

⏱ **Time-consuming, error-prone, requires external tools**

### The Solution (This Tool)

1. **Upload** TikTok FBT PDF
2. **Auto-detect** duplicate pages
3. **Remove duplicates** (keep 1 of every 2)
4. **Resize** to exact 4×6 inches
5. **Download** Amazon-compliant PDF

⚡ **Instant, automated, no external tools needed**

## ✨ Features

- **Drag & drop** PDF upload
- **Automatic duplicate detection** — removes every Nth duplicate page
- **Configurable deduplication** — adjust if your PDF has a different pattern
- **High-quality rendering** at 3× scale to preserve barcode/QR readability
- **Exact 4×6 inch output** pages suitable for Amazon AWD
- **Client-side processing** — no data leaves your browser
- **Dark & light mode** with TikTok-inspired design
- **Preview** labels before downloading
- **Sample PDF generator** for testing
- **Help modal** explaining the problem and solution
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
   - Choose between 2-label (4 pages) or 5-label (10 pages) samples
2. **Review** the detected page count
3. **Configure** if needed (duplicate pattern, which page to keep)
4. **Click** "Convert Labels"
5. **Preview** the output to verify barcode readability
6. **Download** the 4×6 PDF

### Sample PDFs

The app includes built-in sample PDF generators for testing:

- **2 Labels (4 pages)** — 2 unique labels, each duplicated on consecutive pages
- **5 Labels (10 pages)** — 5 unique labels, each duplicated (10 total pages)

These samples include:
- Realistic shipping label layout (FROM/TO addresses)
- Barcodes (Code 128 style)
- QR codes
- Carton IDs and tracking numbers
- Weight and service information

## 🔧 Configuration

| Setting | Options | Default |
|---------|---------|---------|
| Duplicate every | 2, 3, 4 pages | 2 (TikTok FBT) |
| Keep page | 1st, 2nd, 3rd in group | 1st (offset 0) |

### How It Works

**Input:** TikTok FBT PDF with duplicate pages
```
10 pages → Pages 1,2 are Label A | Pages 3,4 are Label B | Pages 5,6 are Label C | etc.
```

**Processing:**
- Keep only odd pages (1, 3, 5, 7, 9)
- Skip duplicate pages (2, 4, 6, 8, 10)
- Render each kept page at 3× quality for barcode clarity
- Place each label on its own 4×6 inch page

**Output:** Amazon-compliant 4×6 PDF
```
5 pages → 5 unique labels, each on a 4×6 inch page
```

## 🏗️ Architecture

```
src/
├── App.tsx              # Main UI (TikTok-themed, help modal, theme toggle)
├── index.css            # TikTok color system & animations
├── main.tsx             # Entry point
└── utils/
    ├── pdfProcessor.ts  # PDF parsing, deduplication, output generation
    └── samplePDF.ts     # Sample TikTok FBT PDF generator
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
Source PDF → pdf.js page info → Deduplicate pages → Render at 3× scale → PNG data URLs → jsPDF 4×6 pages → Download
```

## 📐 Output Specifications

- **Page size:** Exactly 4 × 6 inches (288 × 432 points)
- **Orientation:** Portrait
- **Label placement:** Centered, aspect-ratio preserved
- **Image quality:** PNG at 3× render scale (preserves barcode scanning)
- **Format:** Standard PDF compatible with Amazon AWD and label printers

## 🔒 Privacy

- **100% client-side** — All processing happens in your browser
- **No uploads** — PDFs never leave your device
- **No tracking** — No analytics, no cookies, no accounts
- **No backend** — Static files only, deployable anywhere

## 🧪 Testing Checklist

Test with real TikTok FBT PDFs or the built-in samples:

- [ ] Single label (2 pages, 1 unique)
- [ ] Multiple labels (10 pages, 5 unique)
- [ ] Correct deduplication (no missing/duplicate labels)
- [ ] Barcode readability after conversion
- [ ] QR code readability after conversion
- [ ] Correct 4×6 inch page dimensions
- [ ] Amazon AWD accepts the output PDF
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

**Built for operational use.** Replaces the manual workaround of deleting pages + using ChatGPT. Simple, reliable, no bloat.
