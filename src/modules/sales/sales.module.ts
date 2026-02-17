import { Module } from '@nestjs/common';

import { CartsModule } from './carts/carts.module';

@Module({
  imports: [CartsModule],
})
export class SalesModule {}
