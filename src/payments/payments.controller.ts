import { Controller, ParseUUIDPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService
  ) { }

  @MessagePattern('orders.payment.sessionCreated')
  handlePaymentSessionCreated(
    @Payload('payment_id', ParseUUIDPipe) paymentId: string,
    @Payload('dlocal_payment_id') dlocal_payment_id: string,
  ) {

    return this.paymentsService.handlePaymentSessionCreated(paymentId, dlocal_payment_id);

  }

  @EventPattern('orders.payment.succeeded')
  handlePaymentSucceeded(
    @Payload('order_id', ParseUUIDPipe) orderId: string,
    @Payload('orderStatus') orderStatus: OrderStatus,
    @Payload('payment_id') paymentId: string,
    @Payload('paymentStatus') paymentStatus: PaymentStatus
  ) {

    return this.paymentsService.handlePaymentSucceeded(orderId, orderStatus, paymentId, paymentStatus);

  }

  @EventPattern('orders.payment.failed')
  handlePaymentFailed(
    @Payload('order_id', ParseUUIDPipe) orderId: string,
    @Payload('orderStatus') orderStatus: OrderStatus,
    @Payload('payment_id') paymentId: string,
    @Payload('paymentStatus') paymentStatus: PaymentStatus
  ) {

    return this.paymentsService.handlePaymentFailed(orderId, orderStatus, paymentId, paymentStatus);

  }

}
