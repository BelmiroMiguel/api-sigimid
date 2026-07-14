import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { UploadService } from '../../../core/upload/upload.service';

@Injectable()
export class UtilizadorUploadInterceptor implements NestInterceptor {
  constructor(private readonly uploadService: UploadService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const file = request.file as Express.Multer.File;

    if (!file) {
      return next.handle();
    }

    // Processa o upload físico antes do request atingir o Controller
    return from(
      this.uploadService.guardarFicheiro(file, 'utilizadores/perfil'),
    ).pipe(
      switchMap((res) => {
        // Injeta o caminho físico diretamente no corpo do request
        request.body.fotoPerfil = res.nomeFicheiro;

        // Regista o ficheiro na lista de limpezas automáticas para prevenção de falhas
        request.ficheirosCarregadosSucesso = [res.caminhoFicheiro];

        return next.handle();
      }),
    );
  }
}
