import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const msg = (res as Record<string, unknown>).message;
        if (typeof msg === 'string') {
          message = msg;
        } else {
          message = 'Request failed';
        }
      } else {
        message = 'Request failed';
      }

      // class-validator errors (ValidationPipe)
      if (res && typeof res === 'object') {
        const msg = (res as Record<string, unknown>).message;
        if (Array.isArray(msg)) {
          message = 'Validation failed';
          errors = { _errors: msg.map(String) };
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
    }

    response.status(status).json({
      message,
      statusCode: status,
      ...(errors ? { errors } : {}),
    });
  }
}
