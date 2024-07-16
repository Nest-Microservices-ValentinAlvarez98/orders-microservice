import { Module } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module';
import { NatsModule } from './transports/nats.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [OrdersModule, NatsModule, PaymentsModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
