import { IsString, Length } from "class-validator"


export class CreatePaymentAddressDto {

      @IsString()
      @Length(3, 50)
      street: string

      @IsString()
      @Length(3, 50)
      city: string

      @IsString()
      @Length(3, 50)
      zip_code: string

      @IsString()
      @Length(3, 255)
      full_address: string

}