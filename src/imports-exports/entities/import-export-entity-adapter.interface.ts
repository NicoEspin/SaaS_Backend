import type {
  ExportBuildResult,
  ImportConfirmSummary,
  ImportMode,
  ImportPreviewResult,
  ParsedSpreadsheet,
} from '../import-export.types';

export type ImportPreviewEnvelope<TPreviewPayload, TRow> = {
  response: ImportPreviewResult<TRow>;
  payload: TPreviewPayload;
};

export interface ImportExportEntityAdapter {
  readonly entity: string;

  buildPreview(
    tenantId: string,
    mode: ImportMode,
    parsedFile: ParsedSpreadsheet,
  ): Promise<ImportPreviewEnvelope<unknown, Record<string, unknown>>>;

  confirm(
    tenantId: string,
    mode: ImportMode,
    payload: unknown,
  ): Promise<{
    summary: ImportConfirmSummary;
    errors: Array<{ rowNumber: number; message: string }>;
  }>;

  buildExport(
    tenantId: string,
    columns: string[] | undefined,
    filters: Record<string, unknown>,
  ): Promise<ExportBuildResult>;
}
