import { IsEnum, IsOptional } from "class-validator";
import { PaginationDto } from "src/common";
import { OrderStatus } from "@prisma/client";


export class OrderPaginationDto extends PaginationDto {

      @IsOptional()
      @IsEnum(OrderStatus, {
            message: `Status must be one of the following values: ${Object.values(OrderStatus).join(', ')}`,
            context: { errorCode: 'invalid_status' }
      }
      )
      status: OrderStatus;


}