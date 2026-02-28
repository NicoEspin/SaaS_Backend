import { Module } from '@nestjs/common';

import { CartsModule } from './carts/carts.module';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [CartsModule, InvoicesModule],
})
export class SalesModule {}
