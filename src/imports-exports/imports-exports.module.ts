import { Module } from '@nestjs/common';

import { ProductsModule } from '../products/products.module';
import { ImportFileParserService } from './import-file-parser.service';
import { ImportPreviewStoreService } from './import-preview-store.service';
import { ImportsExportsController } from './imports-exports.controller';
import { ImportsExportsService } from './imports-exports.service';
import { ProductsImportExportAdapter } from './entities/products-import-export.adapter';

@Module({
  imports: [ProductsModule],
  controllers: [ImportsExportsController],
  providers: [
    ImportsExportsService,
    ImportFileParserService,
    ImportPreviewStoreService,
    ProductsImportExportAdapter,
  ],
})
export class ImportsExportsModule {}
