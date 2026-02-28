import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export type InvoicePdfLine = {
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type InvoicePdfData = {
  tenantName: string;
  branchName: string;
  issuedAt: Date | null;
  status: string;
  docType: string | null;
  displayNumber: string | null;
  internalNumber: string;
  customerName: string | null;
  customerTaxId: string | null;
  customerAddress: string | null;
  netSubtotal: string;
  taxTotal: string;
  total: string;
  lines: InvoicePdfLine[];
};

@Injectable()
export class InvoicePdfService {
  async renderInternal(data: InvoicePdfData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const result = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(16).text(data.tenantName, { align: 'left' });
    doc.fontSize(10).text(`Sucursal: ${data.branchName}`);
    doc.moveDown(0.5);

    const titleParts: string[] = [];
    if (data.docType) titleParts.push(`Factura ${data.docType}`);
    else titleParts.push('Factura');
    if (data.displayNumber) titleParts.push(data.displayNumber);
    else titleParts.push(data.internalNumber);
    if (data.status) titleParts.push(`(${data.status})`);
    doc.fontSize(14).text(titleParts.join(' '));
    doc
      .fontSize(10)
      .text(
        `Fecha: ${data.issuedAt ? data.issuedAt.toISOString().slice(0, 10) : '—'}`,
      );
    doc.moveDown(0.75);

    doc.fontSize(11).text('Cliente', { underline: true });
    doc.fontSize(10).text(`Nombre: ${data.customerName ?? 'Consumidor Final'}`);
    if (data.customerTaxId) doc.text(`CUIT/DNI: ${data.customerTaxId}`);
    if (data.customerAddress) doc.text(`Domicilio: ${data.customerAddress}`);
    doc.moveDown(0.75);

    doc.fontSize(11).text('Items', { underline: true });
    doc.moveDown(0.25);

    const startX = doc.x;
    const tableTopY = doc.y;
    const colDescription = startX;
    const colQty = startX + 290;
    const colUnit = startX + 340;
    const colTotal = startX + 440;

    doc.fontSize(9);
    doc.text('Descripcion', colDescription, tableTopY);
    doc.text('Cant.', colQty, tableTopY);
    doc.text('P. Unit', colUnit, tableTopY);
    doc.text('Total', colTotal, tableTopY);
    doc.moveDown(0.5);
    doc
      .moveTo(startX, doc.y)
      .lineTo(startX + 500, doc.y)
      .stroke();
    doc.moveDown(0.25);

    for (const line of data.lines) {
      const y = doc.y;
      doc.text(line.description, colDescription, y, { width: 280 });
      doc.text(String(line.quantity), colQty, y, { width: 40, align: 'right' });
      doc.text(line.unitPrice, colUnit, y, { width: 80, align: 'right' });
      doc.text(line.lineTotal, colTotal, y, { width: 80, align: 'right' });
      doc.moveDown(0.75);
    }

    doc.moveDown(0.5);
    doc
      .moveTo(startX, doc.y)
      .lineTo(startX + 500, doc.y)
      .stroke();
    doc.moveDown(0.5);

    doc.fontSize(10);
    doc.text(`Neto: ${data.netSubtotal}`, { align: 'right' });
    doc.text(`IVA: ${data.taxTotal}`, { align: 'right' });
    doc.fontSize(12).text(`Total: ${data.total}`, { align: 'right' });

    doc.end();
    return result;
  }
}
