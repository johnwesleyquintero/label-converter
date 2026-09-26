import { jsPDF } from 'jspdf';

/**
 * Generate a sample TikTok FBT PDF with 2 duplicate labels per page
 * This mimics the typical format: letter-size page with 2 stacked labels
 */
export function generateSamplePDF(numPages: number = 1): Blob {
  // Standard letter size: 8.5 × 11 inches
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
  });

  const pageWidth = 8.5;
  const pageHeight = 11;
  const labelHeight = pageHeight / 2; // Each label takes half the page
  const margin = 0.25;
  const labelWidth = pageWidth - (margin * 2);

  for (let page = 0; page < numPages; page++) {
    if (page > 0) {
      pdf.addPage('letter', 'portrait');
    }

    // Generate 2 duplicate labels per page
    for (let labelIndex = 0; labelIndex < 2; labelIndex++) {
      const yOffset = labelIndex * labelHeight;
      generateLabel(pdf, yOffset, labelWidth, labelHeight, margin, page + 1, labelIndex + 1);
    }
  }

  return pdf.output('blob');
}

function generateLabel(
  pdf: jsPDF,
  yOffset: number,
  width: number,
  height: number,
  margin: number,
  pageNum: number,
  labelNum: number
) {
  const x = margin;
  const y = yOffset + margin;
  const contentWidth = width - (margin * 2);
  const contentHeight = height - (margin * 2);

  // Draw label border
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.01);
  pdf.rect(x, y, contentWidth, contentHeight);

  let currentY = y + 0.15;

  // Header: TikTok FBT
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TikTok FBT', x + 0.15, currentY);
  currentY += 0.15;

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Fulfilled by TikTok', x + 0.15, currentY);
  currentY += 0.25;

  // FROM section
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FROM:', x + 0.15, currentY);
  currentY += 0.12;

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('TikTok Fulfillment Center', x + 0.15, currentY);
  currentY += 0.1;
  pdf.text('1234 Warehouse Blvd', x + 0.15, currentY);
  currentY += 0.1;
  pdf.text('Los Angeles, CA 90001', x + 0.15, currentY);
  currentY += 0.2;

  // TO section
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SHIP TO:', x + 0.15, currentY);
  currentY += 0.12;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('John Smith', x + 0.15, currentY);
  currentY += 0.12;

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('5678 Customer Street, Apt 4B', x + 0.15, currentY);
  currentY += 0.1;
  pdf.text('New York, NY 10001', x + 0.15, currentY);
  currentY += 0.1;
  pdf.text('United States', x + 0.15, currentY);
  currentY += 0.25;

  // Order info
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Order ID:', x + 0.15, currentY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`TT-${Date.now().toString().slice(-8)}-${pageNum}${labelNum}`, x + 0.7, currentY);
  currentY += 0.12;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Tracking:', x + 0.15, currentY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`1Z999AA1${String(pageNum).padStart(2, '0')}${String(labelNum).padStart(2, '0')}9999`, x + 0.7, currentY);
  currentY += 0.2;

  // Barcode (Code 128 simulation)
  const barcodeY = currentY;
  const barcodeWidth = 2.5;
  const barcodeHeight = 0.4;

  // Draw barcode lines
  pdf.setFillColor(0, 0, 0);
  const barcodeX = x + 0.15;
  const numBars = 40;
  const barWidth = barcodeWidth / numBars;

  for (let i = 0; i < numBars; i++) {
    // Simulate barcode pattern (alternating thick/thin bars)
    const isBar = i % 2 === 0;
    const thickness = (i % 4 === 0) ? barWidth * 1.5 : barWidth * 0.8;
    if (isBar) {
      pdf.rect(barcodeX + (i * barWidth), barcodeY, thickness, barcodeHeight, 'F');
    }
  }

  // Barcode text
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`1Z999AA1${String(pageNum).padStart(2, '0')}${String(labelNum).padStart(2, '0')}9999`, barcodeX, barcodeY + barcodeHeight + 0.08);

  currentY = barcodeY + barcodeHeight + 0.25;

  // QR Code (simplified simulation)
  const qrSize = 0.6;
  const qrX = x + contentWidth - qrSize - 0.15;
  const qrY = y + 0.15;

  // Draw QR code border
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.005);
  pdf.rect(qrX, qrY, qrSize, qrSize);

  // Draw QR pattern (simplified)
  const qrCellSize = qrSize / 21; // Standard QR is 21x21 for version 1
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
      // Random fill pattern
      if (Math.random() > 0.5) {
        pdf.rect(qrX + (col * qrCellSize), qrY + (row * qrCellSize), qrCellSize, qrCellSize, 'F');
      }
    }
  }

  // Weight and service
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('WT:', x + 0.15, currentY);
  pdf.setFont('helvetica', 'normal');
  pdf.text('2.5 lbs', x + 0.35, currentY);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Service:', x + 1.2, currentY);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Ground', x + 1.6, currentY);

  currentY += 0.15;

  // Package info
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Page ${pageNum} | Label ${labelNum} of 2 (Duplicate)`, x + 0.15, currentY);
}

function drawQRMarker(pdf: jsPDF, x: number, y: number, size: number) {
  // Outer square
  pdf.setFillColor(0, 0, 0);
  pdf.rect(x, y, size, size, 'F' as const);

  // Inner white square
  pdf.setFillColor(255, 255, 255);
  const innerMargin = size / 7;
  pdf.rect(x + innerMargin, y + innerMargin, size - (innerMargin * 2), size - (innerMargin * 2), 'F' as const);

  // Center square
  pdf.setFillColor(0, 0, 0);
  const centerSize = size / 2.5;
  const centerOffset = (size - centerSize) / 2;
  pdf.rect(x + centerOffset, y + centerOffset, centerSize, centerSize, 'F' as const);
}

/**
 * Download the sample PDF
 */
export function downloadSamplePDF(numPages: number = 1) {
  const blob = generateSamplePDF(numPages);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tiktok-fbt-sample-${numPages}-page${numPages !== 1 ? 's' : ''}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
