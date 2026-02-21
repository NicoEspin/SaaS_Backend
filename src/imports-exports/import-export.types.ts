export const IMPORT_EXPORT_ENTITIES = ['products'] as const;
export type ImportExportEntity = (typeof IMPORT_EXPORT_ENTITIES)[number];

export const IMPORT_MODES = ['create', 'update', 'upsert'] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

export const EXPORT_FORMATS = ['xlsx', 'csv'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export type ParsedFileRow = {
  rowNumber: number;
  values: Record<string, unknown>;
};

export type ParsedSpreadsheet = {
  headers: string[];
  rows: ParsedFileRow[];
};

export type ImportPreviewError = {
  rowNumber: number;
  message: string;
  column?: string;
};

export type ImportPreviewSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  willCreate: number;
  willUpdate: number;
};

export type ImportPreviewResult<TItem> = {
  headers: string[];
  rows: TItem[];
  errors: ImportPreviewError[];
  summary: ImportPreviewSummary;
};

export type ImportConfirmSummary = {
  processed: number;
  created: number;
  updated: number;
  failed: number;
};

export type ExportBuildResult = {
  fileName: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | Date | null>>;
};
