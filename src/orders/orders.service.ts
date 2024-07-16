import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PaymentCountry, PaymentCurrency, PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto, OrderPaginationDto, CreateOrderDto } from './dto';
import { NATS_SERVICE } from 'src/config';
import { catchError, firstValueFrom, last } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) {
    super();
  }

  private readonly logger = new Logger(OrdersService.name)

  async onModuleInit() {
    await this.$connect();
    this.logger.log(`${OrdersService.name} connected to the database.`)
  }

  async create(email: string, createOrderDto: CreateOrderDto) {

    const productsIds = createOrderDto.items.map(item => item.productId);

    const products = await this.validateProducts(productsIds);

    const { totalAmount, totalItems } = await this.calculateTotals(createOrderDto.items);

    const transactionResult = await this.$transaction(async (prisma) => {

      const order = await prisma.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          contact_email: email,
        },
      });

      const orderItems = createOrderDto.items.map((item) => ({
        productId: item.productId,
        name: products.find(product => product.id === item.productId).name,
        quantity: item.quantity,
        price: products.find(product => product.id === item.productId).price,
        orderId: order.id
      }));

      await prisma.orderItem.createMany({ data: orderItems });

      const orderCreated = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          Items: {
            select: {
              productId: true,
              quantity: true,
              price: true
            }
          }
        }
      });

      return orderCreated;

    });

    return transactionResult;

  }

  async validateProducts(productsIds: number[]) {

    const products: any[] = await firstValueFrom(
      this.client.send({ cmd: 'validate_products' }, productsIds).pipe(
        catchError(error => {
          throw new RpcException({
            statusCode: HttpStatus.BAD_REQUEST,
            message: `Error: ${error.message}, check logs for more details.`
          });
        })
      )
    );

    return products;

  }

  async calculateTotals(orderItems: any[]) {

    const productsIds = orderItems.map(item => item.productId);

    const products = await this.validateProducts(productsIds);

    const totalAmount: number = orderItems.reduce((acc, orderItem) => {
      const price = products.find(product => product.id === orderItem.productId).price;
      return acc + price * orderItem.quantity;
    }, 0);

    const totalItems: number = orderItems.reduce((acc, orderItem) => acc + orderItem.quantity, 0);

    return {
      totalAmount: totalAmount,
      totalItems: totalItems
    }

  }

  async findAll(orderPaginationDto: OrderPaginationDto) {

    const { page, limit, status } = orderPaginationDto;

    const totalPages = await this.order.count({
      where: {
        status
      }
    });
    const lastPage = Math.ceil(totalPages / limit);

    if (page > lastPage) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Page ${page} not found.`
      })
    }

    const orders = await this.order.findMany({
      where: {
        status
      },
      take: limit,
      skip: (page - 1) * limit
    })

    return {
      data: orders,
      meta: {
        page,
        limit,
        total: totalPages,
        lastPage
      }
    }

  }

  async findOne(id: string) {

    const order = await this.order.findFirst({
      where: {
        id
      },
      include: {
        Items: {
          select: {
            productId: true,
            quantity: true,
            price: true
          }
        }
      },

    });

    if (!order) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found.`
      })
    };

    const productsIds = order.Items.map(item => item.productId);

    const products: any[] = await firstValueFrom(
      this.client.send({
        cmd: 'validate_products'
      }, productsIds).pipe(
        catchError(error => {
          throw new RpcException({
            statusCode: HttpStatus.BAD_REQUEST,
            message: `Error: ${error.message}. Check logs for more details.`
          })
        })
      )
    );

    order.Items = order.Items.map((item) => ({
      ...item,
      name: products.find(product => product.id === item.productId).name,
    }));

    return order;

  }

  async findReceipt(id: string) {

    const findResult = await this.orderReceipt.findUnique({
      where: {
        order_id: id
      },
      include: {
        payment: true,
        order: {
          include: {
            Items: {
              select: {
                productId: true,
                quantity: true,
                name: true,
                price: true
              }
            }
          }
        }
      }
    })

    console.log('findResult', findResult)

    if (!findResult) {

      // Esperar a que se cree el recibo en la base de datos
      await new Promise((resolve) => {
        setTimeout(resolve, 5000)
      })

      const findResult = await this.orderReceipt.findUnique({
        where: {
          order_id: id
        },
        include: {
          payment: true,
          order: {
            include: {
              Items: {
                select: {
                  productId: true,
                  quantity: true,
                  name: true,
                  price: true
                }
              }
            }
          }
        }
      })

      if (!findResult) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: `Receipt for order with id ${id} not found.`
        })
      }

    }


    const receipt = {
      name: findResult.payment.name,
      amount: findResult.payment.amount,
      currency: findResult.payment.currency as PaymentCurrency,
      country: findResult.payment.country as PaymentCountry,
      description: findResult.payment.description,
      products: findResult.order.Items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      receipt_url: findResult.receipt_url,
      created_at: findResult.payment.created_at,
      last_updated: findResult.payment.updated_at
    }

    return receipt;

  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {

    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);

    if (order.status === status) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Order already has status ${status}`
      })
    }

    return this.order.update({
      where: {
        id
      },
      data: {
        status
      }
    })

  }

}
