import { Controller, ParseUUIDPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { ChangeOrderStatusDto, CreateOrderDto, OrderPaginationDto } from './dto';
import { CreatePaymentDto } from 'src/payments/dto';
import { PaymentsService } from 'src/payments/payments.service';

@Controller()
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService
  ) { }

  @MessagePattern('orders.create')
  async create(
    @Payload('order') createOrderDto: CreateOrderDto,
    @Payload('payment') createPaymentDto: CreatePaymentDto
  ) {

    // Crear la orden en la base de datos
    const orderResult = await this.ordersService.create(createPaymentDto.payerProfile.email, createOrderDto);

    // Crear el pago en la base de datos
    const paymentResult = await this.paymentsService.createPayment(orderResult, createPaymentDto);

    // Crear la sesión de pago
    const paymentSession = await this.paymentsService.createPaymentSession(createPaymentDto.payerProfile, createPaymentDto.payerAddress, paymentResult);

    return paymentSession;

  }

  @MessagePattern('orders.findAll')
  findAll(
    @Payload() orderPaginationDto: OrderPaginationDto
  ) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern('orders.findOne')
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern('orders.findReceipt')
  findReceipt(@Payload('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findReceipt(id);
  }

  @MessagePattern('orders.changeStatus')
  changeOrderStatus(
    @Payload() changeOrderStatusDto: ChangeOrderStatusDto
  ) {

    return this.ordersService.changeOrderStatus(changeOrderStatusDto);

  }

}
