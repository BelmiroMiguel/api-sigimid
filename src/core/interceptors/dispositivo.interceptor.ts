import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class DispositivoInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    
    const userAgent = request.headers['user-agent'] || 'Desconhecido';
    const ip = request.ip || request.headers['x-forwarded-for'] || '127.0.0.1';

    this.cls.set('ip', ip);
    this.cls.set('userAgent', userAgent);

    return next.handle();
  }
}