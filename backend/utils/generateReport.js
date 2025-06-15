const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function generateReport(booking, filePath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(filePath);

    // ✅ Ensure reports/ directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(20).text('DiagnoCart Diagnostic Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Patient Name: ${booking.fullName}`);
    doc.text(`Test Type: ${booking.testType}`);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Phone: ${booking.phoneNumber}`);
    doc.text(`Email: ${booking.email}`);
    doc.text(`Age: ${booking.age}`);
    doc.text(`Address: ${booking.address}`);
    doc.moveDown();
    doc.fontSize(12).text('--- Sample Report Details ---');

    if (booking.testType.toLowerCase().includes('blood')) {
      doc.text('Hemoglobin: 13.5 g/dL');
      doc.text('WBC Count: 6,000 /µL');
    } else if (booking.testType.toLowerCase().includes('urine')) {
      doc.text('pH: 6.0');
      doc.text('Proteins: Negative');
    } else if (booking.testType.toLowerCase().includes('x-ray')) {
      doc.text('Findings: Normal Chest X-ray.');
    } else {
      doc.text('Standard test result template.');
    }

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', (err) => {
      console.error('❌ PDF generation error:', err);
      reject(err);
    });
  });
}

module.exports = generateReport;
