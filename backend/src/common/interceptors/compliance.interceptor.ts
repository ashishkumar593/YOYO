import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyReply } from 'fastify';

@Injectable()
export class ComplianceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse<FastifyReply>();
    if (res && typeof res.header === 'function') {
      res.header('x-yoyo-zero-data-retention', 'true');
    }
    return next.handle();
  }
}

