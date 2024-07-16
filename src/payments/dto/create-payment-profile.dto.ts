import { IsEmail, IsOptional, IsString, IsUUID, Length } from "class-validator";


export class CreatePaymentProfileDto {

      @IsString()
      @Length(3, 50)
      name: string

      @IsEmail()
      email: string

      @IsString()
      @Length(8, 13)
      phone: string

      @IsOptional()
      @IsUUID()
      user_reference?: string

}