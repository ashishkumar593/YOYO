import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: (exception as any)?.message || 'Internal server error' };

    const message =
      typeof exceptionResponse === 'object' && (exceptionResponse as any).message
        ? (exceptionResponse as any).message
        : exceptionResponse;

    const errorCode =
      typeof exceptionResponse === 'object' && (exceptionResponse as any).error
        ? (exceptionResponse as any).error
        : 'internal_error';

    this.logger.error(
      `[${request.method}] ${request.url} - Status ${status} - Error: ${JSON.stringify(
        message
      )}`
    );

    // OpenAI standard error envelope on /v1/* routes
    if (request.url.startsWith('/v1/')) {
      return response.status(status).send({
        error: {
          message: Array.isArray(message) ? message.join(', ') : message,
          type: errorCode,
          param: null,
          code: status,
        },
      });
    }

    // Standard RFC 7807 problem details response on other routes
    response.status(status).send({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      errorCode,
    });
  }
}

