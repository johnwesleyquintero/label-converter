import { jsPDF } from 'jspdf';

/**
 * Generate a sample TikTok FBT PDF with duplicate pages
 * This simulates the actual issue: each label appears on 2 consecutive pages
 * Page 1 = Label A, Page 2 = Label A (duplicate)
 * Page 3 = Label B, Page 4 = Label B (duplicate)
 * etc.
 */
export function generateSamplePDF(numLabels: number = 2): Blob {
  // Standard letter size: 8.5 × 11 inches (what TikTok FBT uses)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  });

  const pageWidth = 8.5;
  const pageHeight = 11;
  const margin = 0.5;

  for (let labelNum = 1; labelNum <= numLabels; labelNum++) {
    // Generate 2 identical pages for each label (the duplicate issue)
    for (let duplicate = 0; duplicate < 2; duplicate++) {
      if (labelNum > 1 || duplicate > 0) {
        pdf.addPage('letter', 'portrait');
      }
      // Both pages are EXACTLY identical (like real TikTok FBT)
      generateLabel(pdf, pageWidth, pageHeight, margin, labelNum);
    }
  }

  return pdf.output('blob');
}

function generateLabel(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  labelNum: number
) {
  const contentWidth = pageWidth - (margin * 2);
  const contentHeight = pageHeight - (margin * 2);
  const x = margin;
  const y = margin;

  // Draw label border
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.02);
  pdf.rect(x, y, contentWidth, contentHeight);

  let currentY = y + 0.3;

  // Header: TikTok FBT
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TikTok FBT', x + 0.2, currentY);
  currentY += 0.2;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Fulfilled by TikTok - Carton Label', x + 0.2, currentY);
  currentY += 0.4;

  // FROM section
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FROM:', x + 0.2, currentY);
  currentY += 0.18;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('TikTok Fulfillment Center', x + 0.2, currentY);
  currentY += 0.15;
  pdf.text('1234 Warehouse Blvd', x + 0.2, currentY);
  currentY += 0.15;
  pdf.text('Los Angeles, CA 90001', x + 0.2, currentY);
  currentY += 0.15;
  pdf.text('United States', x + 0.2, currentY);
  currentY += 0.35;

  // TO section
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SHIP TO:', x + 0.2, currentY);
  currentY += 0.18;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Amazon AWD', x + 0.2, currentY);
  currentY += 0.18;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('5678 Distribution Center Dr', x + 0.2, currentY);
  currentY += 0.15;
  pdf.text('Dock 4B', x + 0.2, currentY);
  currentY += 0.15;
  pdf.text('Memphis, TN 38118', x + 0.2, currentY);
  currentY += 0.15;
  pdf.text('United States', x + 0.2, currentY);
  currentY += 0.4;

  // Order info
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Carton ID:', x + 0.2, currentY);
  pdf.setFont('helvetica', 'normal');
  const cartonId = `TT-CARTON-${String(labelNum).padStart(4, '0')}`;
  pdf.text(cartonId, x + 1.1, currentY);
  currentY += 0.18;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Tracking:', x + 0.2, currentY);
  pdf.setFont('helvetica', 'normal');
  const trackingNum = `1Z999AA1012345678${String(labelNum).padStart(2, '0')}`;
  pdf.text(trackingNum, x + 1.1, currentY);
  currentY += 0.18;

  pdf.setFont('helvetica', 'bold');
  pdf.text('PO Number:', x + 0.2, currentY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`PO-${2024000 + labelNum}`, x + 1.1, currentY);
  currentY += 0.35;

  // Barcode (Code 128 simulation)
  const barcodeY = currentY;
  const barcodeWidth = 4.0;
  const barcodeHeight = 0.6;

  // Draw barcode lines
  pdf.setFillColor(0, 0, 0);
  const barcodeX = x + 0.2;
  const numBars = 60;
  const barWidth = barcodeWidth / numBars;

  for (let i = 0; i < numBars; i++) {
    // Simulate barcode pattern
    const isBar = i % 2 === 0;
    const thickness = (i % 4 === 0) ? barWidth * 1.5 : barWidth * 0.8;
    if (isBar) {
      pdf.rect(barcodeX + (i * barWidth), barcodeY, thickness, barcodeHeight, 'F');
    }
  }

  // Barcode text
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(trackingNum, barcodeX, barcodeY + barcodeHeight + 0.12);

  currentY = barcodeY + barcodeHeight + 0.35;

  // QR Code (simplified simulation)
  const qrSize = 0.9;
  const qrX = x + contentWidth - qrSize - 0.2;
  const qrY = y + 0.3;

  // Draw QR code border
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.01);
  pdf.rect(qrX, qrY, qrSize, qrSize);

  // Draw QR pattern
  const qrCellSize = qrSize / 21;
  pdf.setFillColor(0, 0, 0);

  // Corner markers
  drawQRMarker(pdf, qrX, qrY, qrCellSize * 7);
  drawQRMarker(pdf, qrX + qrSize - (qrCellSize * 7), qrY, qrCellSize * 7);
  drawQRMarker(pdf, qrX, qrY + qrSize - (qrCellSize * 7), qrCellSize * 7);

  // Random data cells
  for (let row = 0; row < 21; row++) {
    for (let col = 0; col < 21; col++) {
      // Skip corner markers
      if ((row < 8 && col < 8) || (row < 8 && col > 12) || (row > 12 && col < 8)) {
        continue;
      }
      // Deterministic pattern based on label number
      if ((row * 7 + col * 13 + labelNum * 3) % 3 === 0) {
        pdf.rect(qrX + (col * qrCellSize), qrY + (row * qrCellSize), qrCellSize, qrCellSize, 'F');
      }
    }
  }

  // Weight and service
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Weight:', x + 0.2, currentY);
  pdf.setFont('helvetica', 'normal');
  pdf.text('2.5 lbs', x + 0.9, currentY);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Service:', x + 2.0, currentY);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Ground', x + 2.7, currentY);

  currentY += 0.2;

  // Dimensions
  pdf.setFont('helvetica', 'bold');
  pdf.text('Dimensions:', x + 0.2, currentY);
  pdf.setFont('helvetica', 'normal');
  pdf.text('12" × 10" × 8"', x + 1.2, currentY);

  currentY += 0.35;

  // Footer info
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Carton ${labelNum} | TikTok FBT`, x + 0.2, currentY);
  pdf.text('Amazon AWD Compliant Format', x + contentWidth - 2.5, currentY);
}

function drawQRMarker(pdf: jsPDF, x: number, y: number, size: number) {
  // Outer square
  pdf.setFillColor(0, 0, 0);
  pdf.rect(x, y, size, size, 'F');

  // Inner white square
  pdf.setFillColor(255, 255, 255);
  const innerMargin = size / 7;
  pdf.rect(x + innerMargin, y + innerMargin, size - (innerMargin * 2), size - (innerMargin * 2), 'F');

  // Center square
  pdf.setFillColor(0, 0, 0);
  const centerSize = size / 2.5;
  const centerOffset = (size - centerSize) / 2;
  pdf.rect(x + centerOffset, y + centerOffset, centerSize, centerSize, 'F');
}

/**
 * Download the sample PDF
 */
export function downloadSamplePDF(numLabels: number = 2) {
  const blob = generateSamplePDF(numLabels);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tiktok-fbt-sample-${numLabels}-labels-${numLabels * 2}-pages.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
