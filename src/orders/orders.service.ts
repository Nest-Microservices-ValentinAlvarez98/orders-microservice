import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';
import { UUID } from 'crypto';
import { ChangeOrderStatusDto, OrderPaginationDto } from './dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrdersService')

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection has been established.')
  }

  create(createOrderDto: CreateOrderDto) {

    return this.order.create({
      data: {
        ...createOrderDto
      }
    });

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
      }
    })

    if (!order) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found.`
      })
    }

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
