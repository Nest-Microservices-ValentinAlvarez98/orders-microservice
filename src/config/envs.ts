
import { PaymentExpirationType } from '@prisma/client'
import 'dotenv/config'
import * as joi from 'joi'

interface EnvVars {

      PORT: number

      EXPIRATION_TYPE: PaymentExpirationType
      EXPIRATION_VALUE: number

      RECEIPT_URL: string

      /* PRODUCTS_MICROSERVICE_HOST: string
      PRODUCTS_MICROSERVICE_PORT: number */

      NATS_SERVERS: string[]

}

const envsSchema = joi.object({

      PORT: joi.number().required(),

      EXPIRATION_TYPE: joi.string().valid('MINUTES', 'HOURS', 'DAYS').required(),
      EXPIRATION_VALUE: joi.number().required(),

      RECEIPT_URL: joi.string().required(),

      /* PRODUCTS_MICROSERVICE_HOST: joi.string().required(),
      PRODUCTS_MICROSERVICE_PORT: joi.number().required() */

      NATS_SERVERS: joi.array().items(joi.string()).required()

}).unknown(true)

const { error, value } = envsSchema.validate({
      ...process.env,
      NATS_SERVERS: process.env.NATS_SERVERS.split(',')
})

if (error) {

      throw new Error(`Config validation error: ${error.message}`)

}

const envVars: EnvVars = value;

export const envs = {

      port: envVars.PORT,

      expiration_type: envVars.EXPIRATION_TYPE,
      expiration_value: envVars.EXPIRATION_VALUE,

      receiptUrl: envVars.RECEIPT_URL,

      /* productsMicroservice: {

            host: envVars.PRODUCTS_MICROSERVICE_HOST,
            port: envVars.PRODUCTS_MICROSERVICE_PORT

      } */

      natsServers: envVars.NATS_SERVERS

}