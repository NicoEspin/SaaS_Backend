import { Injectable, NotFoundException } from '@nestjs/common';

import { newId } from '../common/ids/new-id';
import type { ImportExportEntity, ImportMode } from './import-export.types';

type StoredPreview = {
  id: string;
  tenantId: string;
  entity: ImportExportEntity;
  mode: ImportMode;
  createdAt: Date;
  expiresAt: Date;
  payload: unknown;
};

@Injectable()
export class ImportPreviewStoreService {
  private readonly previews = new Map<string, StoredPreview>();
  private readonly ttlMs = 15 * 60 * 1000;

  save<TPayload>(
    tenantId: string,
    entity: ImportExportEntity,
    mode: ImportMode,
    payload: TPayload,
  ): StoredPreview {
    this.cleanupExpired();
    const id = newId();
    const now = new Date();
    const preview: StoredPreview = {
      id,
      tenantId,
      entity,
      mode,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.ttlMs),
      payload,
    };
    this.previews.set(id, preview);
    return preview;
  }

  take<TPayload>(
    tenantId: string,
    entity: ImportExportEntity,
    id: string,
  ): { mode: ImportMode; payload: TPayload } {
    this.cleanupExpired();
    const preview = this.previews.get(id);
    if (
      !preview ||
      preview.tenantId !== tenantId ||
      preview.entity !== entity
    ) {
      throw new NotFoundException('Import preview not found or expired');
    }
    this.previews.delete(id);
    return {
      mode: preview.mode,
      payload: preview.payload as TPayload,
    };
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, preview] of this.previews.entries()) {
      if (preview.expiresAt.getTime() <= now) {
        this.previews.delete(id);
      }
    }
  }
}
