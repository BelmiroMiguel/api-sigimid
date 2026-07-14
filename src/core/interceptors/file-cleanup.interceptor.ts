import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class FileCleanupInterceptor implements NestInterceptor {
  constructor(private readonly uploadService: UploadService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      catchError((error) => {
        // Se ocorrer um erro após o upload de ficheiros, inicia-se a limpeza preventiva imediata
        const ficheirosParaLimpar: string[] =
          request.ficheirosCarregadosSucesso || [];

        if (ficheirosParaLimpar.length > 0) {
          // Processar de forma assíncrona background a eliminação física
          ficheirosParaLimpar.forEach((caminho) => {
            this.uploadService.removerFicheiroFisico(caminho);
          });
        }

        return throwError(() => error);
      }),
    );
  }
}
