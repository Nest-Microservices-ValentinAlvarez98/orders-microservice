import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { NatsModule } from 'src/transports/nats.module';
import { PaymentsService } from 'src/payments/payments.service';

@Module({
  imports: [
    NatsModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService, PaymentsService],
})
export class OrdersModule { }
