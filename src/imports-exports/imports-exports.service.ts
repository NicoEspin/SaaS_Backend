import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

import { ImportFileParserService } from './import-file-parser.service';
import { ImportPreviewStoreService } from './import-preview-store.service';
import type {
  ExportBuildResult,
  ExportFormat,
  ImportExportEntity,
  ImportMode,
} from './import-export.types';
import type { ImportExportEntityAdapter } from './entities/import-export-entity-adapter.interface';
import { ProductsImportExportAdapter } from './entities/products-import-export.adapter';

@Injectable()
export class ImportsExportsService {
  private readonly adapters: Map<ImportExportEntity, ImportExportEntityAdapter>;

  constructor(
    private readonly parser: ImportFileParserService,
    private readonly previewStore: ImportPreviewStoreService,
    productsAdapter: ProductsImportExportAdapter,
  ) {
    this.adapters = new Map([[productsAdapter.entity, productsAdapter]]);
  }

  async previewImport(
    tenantId: string,
    entity: ImportExportEntity,
    mode: ImportMode,
    file: { originalname: string; buffer: Buffer },
  ): Promise<{
    previewId: string;
    entity: ImportExportEntity;
    mode: ImportMode;
    headers: string[];
    rows: Record<string, unknown>[];
    errors: Array<{ rowNumber: number; message: string; column?: string }>;
    summary: {
      totalRows: number;
      validRows: number;
      invalidRows: number;
      willCreate: number;
      willUpdate: number;
    };
  }> {
    const adapter = this.getAdapter(entity);
    const parsed = await this.parser.parse(file);
    const preview = await adapter.buildPreview(tenantId, mode, parsed);
    const saved = this.previewStore.save(
      tenantId,
      entity,
      mode,
      preview.payload,
    );

    return {
      previewId: saved.id,
      entity,
      mode,
      ...preview.response,
    };
  }

  async confirmImport(
    tenantId: string,
    entity: ImportExportEntity,
    previewId: string,
  ): Promise<{
    entity: ImportExportEntity;
    summary: {
      processed: number;
      created: number;
      updated: number;
      failed: number;
    };
    errors: Array<{ rowNumber: number; message: string }>;
  }> {
    const adapter = this.getAdapter(entity);
    const storedPreview = this.previewStore.take<unknown>(
      tenantId,
      entity,
      previewId,
    );
    const result = await adapter.confirm(
      tenantId,
      storedPreview.mode,
      storedPreview.payload,
    );

    return {
      entity,
      summary: result.summary,
      errors: result.errors,
    };
  }

  async exportData(
    tenantId: string,
    entity: ImportExportEntity,
    format: ExportFormat,
    columns: string[] | undefined,
    filters: Record<string, unknown>,
  ): Promise<{ fileName: string; mimeType: string; buffer: Buffer }> {
    const adapter = this.getAdapter(entity);
    const exportResult = await adapter.buildExport(tenantId, columns, filters);
    const file = await this.buildFile(exportResult, format);
    return {
      fileName: `${exportResult.fileName}.${format}`,
      mimeType:
        format === 'csv'
          ? 'text/csv; charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: file,
    };
  }

  private getAdapter(entity: ImportExportEntity): ImportExportEntityAdapter {
    const adapter = this.adapters.get(entity);
    if (!adapter) {
      throw new BadRequestException(`Entity '${entity}' is not supported`);
    }
    return adapter;
  }

  private async buildFile(
    exportResult: ExportBuildResult,
    format: ExportFormat,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('data');

    worksheet.addRow(exportResult.columns);
    for (const row of exportResult.rows) {
      const values = exportResult.columns.map((column) => row[column] ?? null);
      worksheet.addRow(values);
    }

    if (format === 'csv') {
      const csvBuffer = await workbook.csv.writeBuffer();
      return Buffer.from(csvBuffer as ArrayBuffer);
    }

    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(xlsxBuffer as ArrayBuffer);
  }
}
