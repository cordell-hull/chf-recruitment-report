import { PDFDocument, rgb, StandardFonts } from 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm';
import { ORG_CONFIG } from '../config/org.js';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

export class PDFGenerator {
  constructor() {
    this.pdfDoc = null;
    this.currentPage = null;
    this.currentY = 0;
    this.font = null;
    this.fontBold = null;
    this.margins = ORG_CONFIG.pdf.margins;
    this.colors = ORG_CONFIG.pdf.colors;
    this.fonts = ORG_CONFIG.pdf.fonts;
    this.contentWidth = PAGE_WIDTH - this.margins.left - this.margins.right;
  }

  async init() {
    this.pdfDoc = await PDFDocument.create();
    this.pdfDoc.setTitle('Recruiting Report');
    this.pdfDoc.setAuthor(ORG_CONFIG.pdf.author);
    this.pdfDoc.setCreationDate(new Date());

    this.font = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
    this.fontBold = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);

    this.addNewPage();
  }

  addNewPage() {
    this.currentPage = this.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.currentY = PAGE_HEIGHT - this.margins.top;
  }

  addPageIfNeeded(neededHeight) {
    if (this.currentY - neededHeight < this.margins.bottom) {
      this.addNewPage();
      return true;
    }
    return false;
  }

  addSpace(space) { this.currentY -= space; }

  _sanitize(text) {
    return (text || '').replace(/[\r\n]+/g, ' ').trim();
  }

  drawLine() {
    this.addPageIfNeeded(15);
    this.currentY -= 5;
    this.currentPage.drawLine({
      start: { x: this.margins.left, y: this.currentY },
      end: { x: PAGE_WIDTH - this.margins.right, y: this.currentY },
      thickness: 0.5,
      color: rgb(this.colors.lightGray.r, this.colors.lightGray.g, this.colors.lightGray.b)
    });
    this.currentY -= 10;
  }

  async drawOrgHeader() {
    let logoBytes = null;
    try {
      const resp = await fetch(ORG_CONFIG.logoPath);
      if (resp.ok) logoBytes = new Uint8Array(await (await resp.blob()).arrayBuffer());
    } catch {}

    if (logoBytes) {
      try {
        let img;
        try { img = await this.pdfDoc.embedPng(logoBytes); }
        catch { img = await this.pdfDoc.embedJpg(logoBytes); }

        const maxH = 60, maxW = 150;
        const aspect = img.width / img.height;
        let w = maxW, h = w / aspect;
        if (h > maxH) { h = maxH; w = h * aspect; }

        this.currentPage.drawImage(img, {
          x: this.margins.left, y: this.currentY - h, width: w, height: h
        });
      } catch {}
    }

    const rightX = PAGE_WIDTH - this.margins.right;
    let textY = this.currentY - 12;

    const nameW = this.fontBold.widthOfTextAtSize(ORG_CONFIG.name, 11);
    this.currentPage.drawText(ORG_CONFIG.name, {
      x: rightX - nameW, y: textY, size: 11, font: this.fontBold,
      color: rgb(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b)
    });
    textY -= 14;

    for (const line of ORG_CONFIG.address) {
      const lw = this.font.widthOfTextAtSize(line, 9);
      this.currentPage.drawText(line, {
        x: rightX - lw, y: textY, size: 9, font: this.font,
        color: rgb(this.colors.secondary.r, this.colors.secondary.g, this.colors.secondary.b)
      });
      textY -= 12;
    }

    const ww = this.font.widthOfTextAtSize(ORG_CONFIG.website, 9);
    this.currentPage.drawText(ORG_CONFIG.website, {
      x: rightX - ww, y: textY, size: 9, font: this.font,
      color: rgb(this.colors.accent.r, this.colors.accent.g, this.colors.accent.b)
    });

    this.currentY -= 80;
    this.drawLine();
  }

  drawTitle(title, subtitle) {
    this.addSpace(10);
    const tw = this.fontBold.widthOfTextAtSize(title, this.fonts.title);
    this.currentPage.drawText(title, {
      x: (PAGE_WIDTH - tw) / 2, y: this.currentY - this.fonts.title,
      size: this.fonts.title, font: this.fontBold,
      color: rgb(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b)
    });
    this.currentY -= this.fonts.title + 10;

    if (subtitle) {
      const sw = this.fontBold.widthOfTextAtSize(subtitle, this.fonts.subheading);
      this.currentPage.drawText(subtitle, {
        x: (PAGE_WIDTH - sw) / 2, y: this.currentY - this.fonts.subheading,
        size: this.fonts.subheading, font: this.fontBold,
        color: rgb(this.colors.secondary.r, this.colors.secondary.g, this.colors.secondary.b)
      });
      this.currentY -= this.fonts.subheading + 15;
    }
  }

  drawSectionHeading(text) {
    this.addPageIfNeeded(40);
    this.currentY -= 15;
    this.currentPage.drawText(text, {
      x: this.margins.left, y: this.currentY - this.fonts.heading,
      size: this.fonts.heading, font: this.fontBold,
      color: rgb(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b)
    });
    this.currentY -= this.fonts.heading + 5;
    this.currentPage.drawLine({
      start: { x: this.margins.left, y: this.currentY },
      end: { x: PAGE_WIDTH - this.margins.right, y: this.currentY },
      thickness: 1,
      color: rgb(this.colors.primary.r, this.colors.primary.g, this.colors.primary.b)
    });
    this.currentY -= 10;
  }

  drawField(label, value, options = {}) {
    const { bold = false, fontSize = this.fonts.body } = options;
    const sanitized = this._sanitize(value);
    const lineHeight = fontSize * 1.6;
    this.addPageIfNeeded(lineHeight);

    const font = bold ? this.fontBold : this.font;

    this.currentPage.drawText(this._sanitize(label) + ':', {
      x: this.margins.left + 5, y: this.currentY - fontSize,
      size: fontSize, font: this.fontBold,
      color: rgb(this.colors.secondary.r, this.colors.secondary.g, this.colors.secondary.b)
    });

    const labelWidth = this.fontBold.widthOfTextAtSize(this._sanitize(label) + ': ', fontSize);
    const valueX = this.margins.left + 5 + labelWidth;
    const maxValueWidth = this.contentWidth - labelWidth - 10;

    if (this.font.widthOfTextAtSize(sanitized, fontSize) <= maxValueWidth) {
      this.currentPage.drawText(sanitized, {
        x: valueX, y: this.currentY - fontSize,
        size: fontSize, font,
        color: rgb(this.colors.text.r, this.colors.text.g, this.colors.text.b)
      });
      this.currentY -= lineHeight;
    } else {
      this.currentY -= lineHeight;
      this.drawWrappedText(sanitized, this.margins.left + 20, this.contentWidth - 20);
    }
  }

  drawWrappedText(text, x, maxWidth, options = {}) {
    const { fontSize = this.fonts.body, font = this.font, color = this.colors.text, lineHeight = 1.3 } = options;
    if (!text || text.trim() === '') return 0;

    const words = text.split(/\s+/);
    const lines = [];
    let cur = '';

    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth && cur) {
        lines.push(cur);
        cur = word;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);

    const lh = fontSize * lineHeight;
    for (const line of lines) {
      if (this.currentY - lh < this.margins.bottom) this.addNewPage();
      this.currentPage.drawText(line, {
        x, y: this.currentY - fontSize, size: fontSize, font,
        color: rgb(color.r, color.g, color.b)
      });
      this.currentY -= lh;
    }
    return lines.length * lh;
  }

  drawCheckItem(label, checked, details) {
    const lineHeight = this.fonts.body * 1.6;
    this.addPageIfNeeded(lineHeight);

    const mark = checked ? '[X]' : '[ ]';
    const text = `${mark} ${this._sanitize(label)}`;

    this.currentPage.drawText(text, {
      x: this.margins.left + 10, y: this.currentY - this.fonts.body,
      size: this.fonts.body, font: this.font,
      color: rgb(this.colors.text.r, this.colors.text.g, this.colors.text.b)
    });
    this.currentY -= lineHeight;

    if (checked && details) {
      this.drawWrappedText(details, this.margins.left + 30, this.contentWidth - 30, {
        fontSize: this.fonts.caption,
        color: this.colors.secondary
      });
    }
  }

  async generate(report, onProgress = () => {}) {
    onProgress('Initializing PDF...');
    await this.init();
    await this.drawOrgHeader();

    this.drawTitle('Recruiting Report', report.schoolName);

    // Date
    this.drawField('Date', report.date);
    this.addSpace(5);

    // (1) Teacher name
    onProgress('Adding teacher information...');
    this.drawField('(1) First Name', report.teacherFirstName);
    this.drawField('    Last Name', report.teacherLastName);
    this.drawField('(2) Teacher Email', report.teacherEmail);

    // (3-5) Interview
    onProgress('Adding interview details...');
    this.drawField('(3) Date(s) of Interview(s)', report.interviewDates);
    const placeStr = [report.interviewPlace, report.interviewCountry, report.interviewPlatform].filter(Boolean).join(' – ');
    this.drawField('(4) Place – Country – Platform', placeStr);
    this.drawField('(5) Length of time spent', report.interviewLength);

    // (6) References
    onProgress('Adding references...');
    this.drawSectionHeading('(6) References');

    for (let i = 0; i < report.references.length; i++) {
      const ref = report.references[i];
      if (!ref.name) continue;

      const refText = [
        ref.name,
        ref.title ? `(${ref.title})` : '',
        ref.email ? `— ${ref.email}` : ''
      ].filter(Boolean).join(' ');

      const contactInfo = [
        ref.dateContacted ? `Contacted: ${ref.dateContacted}` : '',
        ref.platform ? `via ${ref.platform}` : ''
      ].filter(Boolean).join(' ');

      this.drawWrappedText(`${i + 1}. ${refText}`, this.margins.left + 10, this.contentWidth - 10);
      if (contactInfo) {
        this.drawWrappedText(contactInfo, this.margins.left + 25, this.contentWidth - 25, {
          fontSize: this.fonts.caption, color: this.colors.secondary
        });
      }
      this.addSpace(3);
    }

    // (7) Communication
    this.drawSectionHeading('(7) Communication');
    this.drawWrappedText(report.communicationDetails, this.margins.left + 10, this.contentWidth - 10);

    // (8) English test
    onProgress('Adding English assessment...');
    this.drawSectionHeading('(8) English Test');

    this.drawField('a. Verbal', report.englishTest.verbalTested ? 'Yes' : 'No');
    if (report.englishTest.verbalTested) {
      if (report.englishTest.verbalDate) {
        this.drawWrappedText(`Date: ${report.englishTest.verbalDate}`, this.margins.left + 25, this.contentWidth - 25, { fontSize: this.fonts.caption });
      }
      if (report.englishTest.verbalAssessment) {
        this.drawWrappedText(`Assessment: ${report.englishTest.verbalAssessment}`, this.margins.left + 25, this.contentWidth - 25, { fontSize: this.fonts.caption });
      }
      this.drawWrappedText(`Tested by native English speaker: ${report.englishTest.verbalByNativeSpeaker ? 'Yes' : 'No'}`, this.margins.left + 25, this.contentWidth - 25, { fontSize: this.fonts.caption });
    }

    this.drawField('b. Written', report.englishTest.writtenTested ? 'Yes' : 'No');
    if (report.englishTest.writtenTested && report.englishTest.writtenNotes) {
      this.drawWrappedText(report.englishTest.writtenNotes, this.margins.left + 25, this.contentWidth - 25, { fontSize: this.fonts.caption });
    }

    // (9) Arrival services
    onProgress('Adding arrival services...');
    this.drawSectionHeading('(9) Arrival Services');

    const serviceLabels = {
      meetAtAirport: 'Meet at airport',
      hostFamily: 'Find a host family for the first two weeks',
      transientHotel: 'Arrange transient hotel for the first two weeks',
      rentalCar: 'Rent a car for the first two weeks',
      housingAssistance: 'Help find a place to live and furnish the apartment',
      socialSecurity: 'Help apply for Social Security card and accompany to office'
    };

    for (const [key, label] of Object.entries(serviceLabels)) {
      const svc = report.arrivalServices[key];
      this.drawCheckItem(label, svc.provided, svc.details);
    }

    // Certification
    onProgress('Adding certification...');
    this.drawSectionHeading('Certification');

    if (report.certification.procedures) {
      this.drawField('Procedures and costs', '');
      this.drawWrappedText(report.certification.procedures, this.margins.left + 15, this.contentWidth - 15);
    }

    if (report.certification.stepsToObtain) {
      this.drawField('Steps to obtain certification', '');
      this.drawWrappedText(report.certification.stepsToObtain, this.margins.left + 15, this.contentWidth - 15);
    }

    if (report.certification.teacherCost) {
      const timing = report.certification.costTiming === 'advance' ? 'pay in advance'
        : report.certification.costTiming === 'after_arrival' ? 'pay after arrival' : '';
      const timingStr = timing ? ` (${timing})` : '';
      this.drawField('Teacher cost', `${report.certification.costAmount}${timingStr}`);
    } else {
      this.drawField('Teacher cost', 'No');
    }

    // Native English speaker
    if (report.nativeEnglishSpeaker.applicable) {
      this.drawSectionHeading('Native English Speaker Justification');
      this.drawWrappedText(report.nativeEnglishSpeaker.justification, this.margins.left + 10, this.contentWidth - 10);
    }

    // Signature
    onProgress('Adding signature...');
    this.addSpace(20);
    this.drawLine();

    if (report.signature.imageDataUrl) {
      this.addPageIfNeeded(100);
      try {
        const sigData = report.signature.imageDataUrl.split(',')[1];
        const sigBytes = Uint8Array.from(atob(sigData), c => c.charCodeAt(0));
        const sigImage = await this.pdfDoc.embedPng(sigBytes);

        const maxW = 200, maxH = 80;
        const aspect = sigImage.width / sigImage.height;
        let w = maxW, h = w / aspect;
        if (h > maxH) { h = maxH; w = h * aspect; }

        this.currentPage.drawImage(sigImage, {
          x: this.margins.left, y: this.currentY - h, width: w, height: h
        });
        this.currentY -= h + 10;
      } catch (e) {
        console.warn('Could not embed signature:', e);
      }
    }

    this.drawField('Signed by', report.signature.signerName);
    this.drawField('Title', report.signature.signerTitle);

    onProgress('Finalizing PDF...');
    return await this.pdfDoc.save();
  }
}

export async function generatePDF(report, onProgress = () => {}) {
  const generator = new PDFGenerator();
  return await generator.generate(report, onProgress);
}

export function generateFilename(date, lastName) {
  const sanitize = (str) => str.replace(/[^a-zA-Z0-9-_]/g, '_').replace(/_+/g, '_');
  return `Recruiting_Report_${sanitize(date)}_${sanitize(lastName)}.pdf`;
}

export function downloadPDF(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
