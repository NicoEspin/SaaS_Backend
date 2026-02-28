import { Module } from '@nestjs/common';

import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [SuppliersModule, PurchaseOrdersModule],
})
export class PurchasingModule {}
