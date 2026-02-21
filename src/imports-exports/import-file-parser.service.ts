import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';

import type { ParsedSpreadsheet } from './import-export.types';

function sanitizeHeader(rawHeader: unknown): string | null {
  if (typeof rawHeader !== 'string') return null;
  const value = rawHeader.trim();
  return value.length > 0 ? value : null;
}

function normalizeCellValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null) {
    if ('result' in value) {
      const formulaResult = (value as { result?: unknown }).result;
      return normalizeCellValue(formulaResult);
    }
    if ('text' in value) {
      const textValue = (value as { text?: unknown }).text;
      if (typeof textValue === 'string') return textValue;
    }
  }
  return value;
}

type UploadedFile = {
  originalname: string;
  buffer: Buffer;
};

@Injectable()
export class ImportFileParserService {
  async parse(file: UploadedFile): Promise<ParsedSpreadsheet> {
    const extension = file.originalname.split('.').pop()?.toLowerCase();

    if (extension === 'xlsx') {
      return this.parseXlsx(Buffer.from(file.buffer));
    }
    if (extension === 'csv') {
      return this.parseCsv(Buffer.from(file.buffer));
    }

    throw new BadRequestException('Only .xlsx and .csv files are supported');
  }

  private async parseXlsx(buffer: Buffer): Promise<ParsedSpreadsheet> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('The spreadsheet has no worksheets');
    }

    const headerRow = worksheet.getRow(1);
    const headerColumns: Array<{ colNumber: number; header: string }> = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = sanitizeHeader(normalizeCellValue(cell.value));
      if (header) {
        headerColumns.push({ colNumber, header });
      }
    });
    const headers = headerColumns.map((item) => item.header);

    if (headers.length === 0) {
      throw new BadRequestException('The file does not contain headers');
    }

    const rows: ParsedSpreadsheet['rows'] = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const values: Record<string, unknown> = {};
      let hasAnyValue = false;

      headerColumns.forEach(({ colNumber, header }) => {
        const cellValue = normalizeCellValue(row.getCell(colNumber).value);
        if (
          cellValue !== null &&
          cellValue !== undefined &&
          !(typeof cellValue === 'string' && cellValue.trim() === '')
        ) {
          hasAnyValue = true;
        }
        values[header] = cellValue;
      });

      if (hasAnyValue) {
        rows.push({ rowNumber, values });
      }
    });

    return { headers, rows };
  }

  private parseCsv(buffer: Buffer): ParsedSpreadsheet {
    const parsed = parse(buffer, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      trim: false,
    });

    if (!Array.isArray(parsed)) {
      throw new BadRequestException('Invalid CSV file');
    }

    const records: Array<Record<string, unknown>> = parsed.filter(
      (row): row is Record<string, unknown> =>
        typeof row === 'object' && row !== null,
    );

    const headers =
      records.length > 0
        ? Object.keys(records[0])
            .map((key) => key.trim())
            .filter(Boolean)
        : [];

    if (headers.length === 0) {
      throw new BadRequestException('The file does not contain headers');
    }

    const rows: ParsedSpreadsheet['rows'] = records.map((values, index) => ({
      rowNumber: index + 2,
      values,
    }));

    return { headers, rows };
  }
}
