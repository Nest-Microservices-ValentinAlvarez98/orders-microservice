import { ArgumentsHost, Catch, ExceptionFilter, } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";


@Catch(RpcException)
export class RpcCustomExceptionFilter implements ExceptionFilter {

      catch(exception: RpcException, host: ArgumentsHost) {

            const ctx = host.switchToHttp()
            const response = ctx.getResponse()
            const rpcError = exception.getError();

            if (
                  typeof rpcError === 'object' &&
                  'statusCode' in rpcError &&
                  'message' in rpcError
            ) {

                  const status = isNaN(+rpcError.statusCode) ? 500 : +rpcError.statusCode;

                  return response.status(status).json(rpcError);

            }


            return response.status(500).json({
                  statusCode: 500,
                  message: 'Internal server error, not handled by the microservice'
            })

      }

}