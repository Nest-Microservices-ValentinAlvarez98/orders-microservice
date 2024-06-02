import { Type } from "class-transformer";
import { IsNumber, IsPositive } from "class-validator";


export class OrderItemDto {

      @IsNumber()
      @IsPositive()
      // Son de tipo number porque nuestro microservicio de products es number
      productId: number;

      @IsNumber()
      @IsPositive()
      quantity: number;

      // El precio se debería tomar del microservicio de productos y eliminarlo de aquí
      @IsNumber()
      @IsPositive()
      price: number;

}