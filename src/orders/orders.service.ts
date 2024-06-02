import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto, OrderPaginationDto, CreateOrderDto } from './dto';
import { PRODUCT_SERVICE } from 'src/config';
import { catchError, firstValueFrom } from 'rxjs';
import { error } from 'console';
import { connect } from 'http2';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productService: ClientProxy
  ) {
    super();
  }

  private readonly logger = new Logger('OrdersService')

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection has been established.')
  }

  async create(createOrderDto: CreateOrderDto) {

    // 1. Confirmar los ids de los productos
    const productsIds = createOrderDto.items.map(item => item.productId);

    // Deberíamos hacer tipado de los productos para evitar errores y facilitar el mantenimiento
    const products: any[] = await firstValueFrom(
      this.productService.send({
        cmd: 'validate_products'
      }, productsIds).pipe(
        catchError(error => {
          throw new RpcException({
            statusCode: HttpStatus.BAD_REQUEST,
            message: `Error: ${error.message}, check logs for more details.`
          })
        })
      )
    )

    // 2. Cálculo de los valores totales
    const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {

      // Tomamos el precio del producto para evitar que el precio sea modificado durante la comunicación
      const price = products.find(
        (product) => product.id === orderItem.productId
      ).price

      return acc + price * orderItem.quantity

    }, 0)

    const totalItems = createOrderDto.items.reduce((acc, orderItem) => {

      return acc + orderItem.quantity

    }, 0)

    // 3. Crear una transacción de base de datos
    const transactionResult = await this.$transaction(async (prisma) => {

      // Crear la orden
      const order = await prisma.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
        }
      }
      );

      // Crear los items de la orden
      const orderItems = createOrderDto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: products.find(product => product.id === item.productId).price,
        orderId: order.id
      }))

      await prisma.orderItem.createMany({
        data: orderItems
      })

      const orderCreated = await prisma.order.findFirst({
        where: {
          id: order.id
        },
        include: {
          OrderItem: {
            select: {
              productId: true,
              quantity: true,
              price: true
            }
          }
        }
      })

      return {
        ...orderCreated,
        OrderItem: orderCreated.OrderItem.map((item) => ({
          ...item,
          name: products.find(product => product.id === item.productId).name
        }))
      }

    })

    // 4. Retornar la respuesta
    return {
      service: 'Orders Microservices',
      createOrderDto: createOrderDto,
      ids: productsIds,
      products: products,
      totalAmount: totalAmount,
      totalItems: totalItems,
      order: transactionResult
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
        OrderItem: {
          select: {
            productId: true,
            quantity: true,
            price: true
          }
        }
      },

    })

    if (!order) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found.`
      })
    }

    const productsIds = order.OrderItem.map(item => item.productId);

    const products: any[] = await firstValueFrom(
      this.productService.send({
        cmd: 'validate_products'
      }, productsIds).pipe(
        catchError(error => {
          throw new RpcException({
            statusCode: HttpStatus.BAD_REQUEST,
            message: `Error: ${error.message}. Check logs for more details.`
          })
        })
      )
    )

    order.OrderItem = order.OrderItem.map((item) => ({
      ...item,
      name: products.find(product => product.id === item.productId).name,
    }));

    return order;

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
