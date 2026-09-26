import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

/**
 * Conversion mode:
 * - 'duplicate-pages': Each label appears on consecutive pages (page 1 = page 2, page 3 = page 4, etc.)
 *                       Keep only every Nth page (default: odd pages)
 * - 'multi-label-page': Multiple labels stacked on a single page (less common)
 */
export type ConversionMode = 'duplicate-pages' | 'multi-label-page';

export interface LabelConfig {
  mode: ConversionMode;
  // For duplicate-pages mode:
  duplicateEvery: number; // Keep 1 out of every N pages (default: 2)
  keepOffset: number;     // Which page in the group to keep (0 = first, 1 = second, etc.)
  // For multi-label-page mode:
  labelsPerPage: number;
  layout: 'vertical' | 'horizontal';
  // Source info:
  sourceWidth: number;
  sourceHeight: number;
}

export interface ProcessingResult {
  labels: string[]; // Data URLs for each label image
  pageCount: number;
  labelCount: number;
  skippedPages: number;
  warnings: string[];
}

export interface PageInfo {
  width: number;
  height: number;
}

// Target label size: 4 × 6 inches
const TARGET_WIDTH_IN = 4;
const TARGET_HEIGHT_IN = 6;

// Render scale for high quality output (preserves barcode readability)
const RENDER_SCALE = 3;

export async function getPDFInfo(file: File): Promise<{ pageCount: number; pages: PageInfo[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PageInfo[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    pages.push({
      width: viewport.width,
      height: viewport.height,
    });
  }

  const pageCount = pdf.numPages;
  pdf.destroy();
  return { pageCount, pages };
}

/**
 * Detect default config based on page geometry.
 * TikTok FBT typically has 1 label per page, with duplicate consecutive pages.
 * Page size is usually letter (8.5 × 11 in = 612 × 792 pts).
 */
export function detectLabelConfig(pages: PageInfo[]): LabelConfig {
  const firstPage = pages[0];
  if (!firstPage) {
    return {
      mode: 'duplicate-pages',
      duplicateEvery: 2,
      keepOffset: 0,
      labelsPerPage: 2,
      layout: 'vertical',
      sourceWidth: 612,
      sourceHeight: 792,
    };
  }

  // Default to duplicate-pages mode (the TikTok FBT issue)
  return {
    mode: 'duplicate-pages',
    duplicateEvery: 2,
    keepOffset: 0,
    labelsPerPage: 2,
    layout: firstPage.height > firstPage.width ? 'vertical' : 'horizontal',
    sourceWidth: firstPage.width,
    sourceHeight: firstPage.height,
  };
}

async function renderPageToCanvas(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  return canvas;
}

function extractLabelsFromCanvas(
  canvas: HTMLCanvasElement,
  config: LabelConfig
): string[] {
  const labels: string[] = [];
  const { labelsPerPage, layout } = config;

  if (labelsPerPage === 1) {
    labels.push(canvas.toDataURL('image/png', 1.0));
    return labels;
  }

  if (layout === 'vertical') {
    const labelHeight = Math.floor(canvas.height / labelsPerPage);
    for (let i = 0; i < labelsPerPage; i++) {
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = canvas.width;
      labelCanvas.height = labelHeight;
      const ctx = labelCanvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
      ctx.drawImage(
        canvas,
        0, i * labelHeight,
        canvas.width, labelHeight,
        0, 0,
        labelCanvas.width, labelCanvas.height
      );
      labels.push(labelCanvas.toDataURL('image/png', 1.0));
    }
  } else {
    const labelWidth = Math.floor(canvas.width / labelsPerPage);
    for (let i = 0; i < labelsPerPage; i++) {
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = labelWidth;
      labelCanvas.height = canvas.height;
      const ctx = labelCanvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
      ctx.drawImage(
        canvas,
        i * labelWidth, 0,
        labelWidth, canvas.height,
        0, 0,
        labelCanvas.width, labelCanvas.height
      );
      labels.push(labelCanvas.toDataURL('image/png', 1.0));
    }
  }

  return labels;
}

export async function processPDF(
  file: File,
  config: LabelConfig,
  onProgress?: (progress: number) => void
): Promise<ProcessingResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const warnings: string[] = [];
  const allLabels: string[] = [];
  const totalPages = pdf.numPages;
  let skippedPages = 0;

  if (config.mode === 'duplicate-pages') {
    // Keep only every Nth page (deduplicate)
    const { duplicateEvery, keepOffset } = config;

    for (let i = 1; i <= totalPages; i++) {
      const positionInGroup = (i - 1) % duplicateEvery;

      if (positionInGroup === keepOffset) {
        // Keep this page
        try {
          const canvas = await renderPageToCanvas(pdf, i, RENDER_SCALE);
          const labels = extractLabelsFromCanvas(canvas, { ...config, labelsPerPage: 1, layout: 'vertical' });
          allLabels.push(...labels);
        } catch (err) {
          console.error(`Error processing page ${i}:`, err);
          warnings.push(`Page ${i} could not be processed and was skipped.`);
        }
      } else {
        // Skip duplicate page
        skippedPages++;
      }

      if (onProgress) {
        onProgress(Math.round((i / totalPages) * 90));
      }
    }

    // Warn if total pages not evenly divisible
    if (totalPages % duplicateEvery !== 0) {
      warnings.push(
        `${totalPages} pages is not evenly divisible by ${duplicateEvery}. Last group may be incomplete.`
      );
    }
  } else {
    // multi-label-page mode
    for (let i = 1; i <= totalPages; i++) {
      try {
        const canvas = await renderPageToCanvas(pdf, i, RENDER_SCALE);
        const labels = extractLabelsFromCanvas(canvas, config);
        allLabels.push(...labels);
      } catch (err) {
        console.error(`Error processing page ${i}:`, err);
        warnings.push(`Page ${i} could not be processed and was skipped.`);
      }

      if (onProgress) {
        onProgress(Math.round((i / totalPages) * 90));
      }
    }
  }

  pdf.destroy();

  if (allLabels.length === 0) {
    warnings.push('No labels detected. Please check the input file and configuration.');
  }

  return {
    labels: allLabels,
    pageCount: totalPages,
    labelCount: allLabels.length,
    skippedPages,
    warnings,
  };
}

export function generateOutputPDFSmart(
  labels: string[],
  labelDimensions: { width: number; height: number }
): { pdf: jsPDF; blob: Blob } {
  // Create PDF with exact 4×6 inch page size
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: [TARGET_WIDTH_IN, TARGET_HEIGHT_IN],
  });

  const { width: lw, height: lh } = labelDimensions;
  const labelAspect = lw / lh;
  const pageAspect = TARGET_WIDTH_IN / TARGET_HEIGHT_IN;

  for (let i = 0; i < labels.length; i++) {
    if (i > 0) {
      pdf.addPage([TARGET_WIDTH_IN, TARGET_HEIGHT_IN], 'portrait');
    }

    const imgData = labels[i];

    // Calculate scaling to fit label within 4×6 while maintaining aspect ratio
    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (labelAspect > pageAspect) {
      // Label is wider relative to its height than the page
      drawWidth = TARGET_WIDTH_IN;
      drawHeight = TARGET_WIDTH_IN / labelAspect;
      offsetX = 0;
      offsetY = (TARGET_HEIGHT_IN - drawHeight) / 2;
    } else {
      // Label is taller relative to its width than the page
      drawHeight = TARGET_HEIGHT_IN;
      drawWidth = TARGET_HEIGHT_IN * labelAspect;
      offsetX = (TARGET_WIDTH_IN - drawWidth) / 2;
      offsetY = 0;
    }

    pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawWidth, drawHeight, undefined, 'FAST');
  }

  const blob = pdf.output('blob');
  return { pdf, blob };
}
