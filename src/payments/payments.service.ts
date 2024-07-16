import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderStatus, PaymentStatus, PrismaClient } from '@prisma/client';
import { envs, NATS_SERVICE } from 'src/config';
import { CreatePaymentAddressDto, CreatePaymentDto, CreatePaymentProfileDto } from './dto';
import { PaymentDB } from './interfaces/payment';
import { catchError } from 'rxjs';

@Injectable()
export class PaymentsService extends PrismaClient implements OnModuleInit {

      constructor(
            @Inject(NATS_SERVICE) private readonly client: ClientProxy
      ) {
            super();
      }

      private readonly logger = new Logger(PaymentsService.name);

      async onModuleInit() {
            await this.$connect();
            this.logger.log(`${PaymentsService.name} connected to the database`);
      }

      async createPayment(order: any, createPaymentDto: CreatePaymentDto) {

            const { id: order_id, totalItems, totalAmount: amount } = order;

            const { payerProfile, payerAddress, ...rest } = createPaymentDto;

            const description: string = `Payment for order ${order_id}.` + "\n" + `Total items: ${totalItems}.` + "\n" + `Total amount: $${amount}.`;

            const transactionResult: PaymentDB = await this.$transaction(async (prisma) => {

                  const payment = await prisma.payment.create({
                        data: {
                              ...rest,
                              name: payerProfile.name,
                              amount: amount,
                              description: description,
                              expiration_type: envs.expiration_type,
                              expiration_value: envs.expiration_value,
                              contact_email: payerProfile.email,
                              order_id: order_id,
                        }
                  })

                  const log_description = `Created payment for order ${payment.order_id}. Contact email: ${payment.contact_email}. Amount: $${payment.amount}. Status: ${payment.status}. Expiration: ${payment.expiration_type} ${payment.expiration_value}. Awaiting payment session.`;

                  await prisma.paymentLog.create({
                        data: {
                              payment_id: payment.id,
                              log_description: log_description
                        }
                  })

                  return payment;

            })

            return transactionResult;

      }

      async createPaymentSession(profile: CreatePaymentProfileDto, address: CreatePaymentAddressDto, payment: PaymentDB) {

            const { id, status, contact_email, dlocal_payment_id, created_at, updated_at, ...rest } = payment;

            const createPaymentSession = {
                  payer: {
                        ...profile,
                        address: address
                  },
                  ...rest
            }

            const paymentResult = this.client.send('payment.create.session', {
                  createPaymentSession: createPaymentSession,
                  paymentId: id
            })
                  .pipe(
                        catchError(error => {
                              throw new RpcException({
                                    statusCode: HttpStatus.BAD_REQUEST,
                                    message: `Error: ${error.message}, check logs for more details.`
                              });
                        })
                  )

            return paymentResult;

      }

      async findPaymentById(id: string) {

            const payment = await this.payment.findUnique({
                  where: {
                        id
                  }
            })

            if (!payment) {
                  throw new RpcException({
                        statusCode: HttpStatus.NOT_FOUND,
                        message: `Payment with id ${id} not found.`
                  })
            }

            return payment;

      }

      async handlePaymentSessionCreated(paymentId: string, dlocal_payment_id: string) {

            console.log('Handle payment session created event.')

            await this.findPaymentById(paymentId);

            const log_description = `Payment session created successfully. Asigned dLocal payment id: ${dlocal_payment_id}. Awaiting payment.`;

            const transactionResult = await this.$transaction(async (prisma) => {

                  const updatedPayment = await prisma.payment.update({
                        where: {
                              id: paymentId
                        },
                        data: {
                              dlocal_payment_id: dlocal_payment_id
                        }
                  })

                  const log_created = await prisma.paymentLog.create({
                        data: {
                              payment_id: paymentId,
                              log_description: log_description
                        }
                  })

                  return {
                        payment: updatedPayment,
                        log: log_created
                  }

            })

            console.log(`Payment session created successfully. Payment id: ${paymentId}. dLocal payment id: ${dlocal_payment_id}. transactionResult: ${transactionResult}`)

            return transactionResult;

      }

      async handlePaymentSucceeded(orderId: string, orderStatus: OrderStatus, paymentId: string, paymentStatus: PaymentStatus) {

            console.log('Entering handlePaymentSucceeded method.')

            console.log(`Payment for order ${orderId} succeeded. Payment id: ${paymentId}. Payment status: ${paymentStatus}. Order status: ${orderStatus}.`)

            if (paymentStatus !== 'PAID' || orderStatus !== 'PAID') {
                  throw new RpcException({
                        statusCode: HttpStatus.BAD_REQUEST,
                        message: `Payment or order status: ${paymentStatus}, not allowed.`
                  })
            }

            const log_description = `Payment for order ${orderId} succeeded. Payment status: ${paymentStatus}. Order status: ${orderStatus}.`;

            await this.$transaction(async (prisma) => {

                  const updatedPayment = await prisma.payment.update({
                        where: {
                              dlocal_payment_id: paymentId
                        },
                        data: {
                              status: paymentStatus
                        }
                  })

                  await prisma.order.update({
                        where: {
                              id: orderId
                        },
                        data: {
                              status: orderStatus
                        }
                  })

                  await prisma.paymentLog.create({
                        data: {
                              payment_id: updatedPayment.id,
                              log_description: log_description,
                              status: updatedPayment.status
                        }
                  })

                  await prisma.orderReceipt.create({
                        data: {
                              receipt_url: `${envs.receiptUrl}/${orderId}`,
                              order_id: orderId,
                              payment_id: updatedPayment.id
                        }
                  })

            })

            console.log(`Result: Payment for order ${orderId} succeeded. Payment status: ${paymentStatus}. Order status: ${orderStatus}.`)

            return {
                  ok: true,
                  message: `Payment successful. Order ${orderId} status updated to ${orderStatus}`
            }

      }

      async handlePaymentFailed(orderId: string, orderStatus: OrderStatus, paymentId: string, paymentStatus: PaymentStatus) {

            console.log('Entering handlePaymentFailed method.')

            console.log(`Payment for order ${orderId} failed. Payment id: ${paymentId}. Payment status: ${paymentStatus}. Order status: ${orderStatus}.`)

            if (orderStatus !== 'CANCELLED') {
                  throw new RpcException({
                        statusCode: HttpStatus.BAD_REQUEST,
                        message: `Order status: ${orderStatus}, not allowed.`
                  })
            }

            const log_description = `Payment for order ${orderId} failed. Payment status: ${paymentStatus}. Order status: ${orderStatus}.`;

            await this.$transaction(async (prisma) => {

                  const updatedPayment = await prisma.payment.update({
                        where: {
                              dlocal_payment_id: paymentId
                        },
                        data: {
                              status: paymentStatus
                        }
                  })

                  await prisma.order.update({
                        where: {
                              id: orderId
                        },
                        data: {
                              status: orderStatus
                        }
                  })

                  await prisma.paymentLog.create({
                        data: {
                              payment_id: updatedPayment.id,
                              log_description: log_description,
                              status: updatedPayment.status
                        }
                  })

            })

            console.log(`Result: Payment for order ${orderId} failed. Payment status: ${paymentStatus}. Order status: ${orderStatus}.`)

            return {
                  ok: false,
                  message: `Payment cancelled. Order ${orderId} status updated to ${orderStatus}`
            }

      }

}