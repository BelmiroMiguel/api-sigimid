import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from, forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { UploadService } from '../../../core/upload/upload.service';

@Injectable()
export class CidadaoUploadInterceptor implements NestInterceptor {
  constructor(private readonly uploadService: UploadService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const files = request.files as {
      fotoPerfil?: Express.Multer.File[];
      fotosCorpoCompleto?: Express.Multer.File[];
    };

    const tarefasUpload: Observable<any>[] = [];
    const ficheirosGravadosComSucesso: string[] = [];

    // 1. Processar Foto de Perfil (Máximo 1)
    if (files?.fotoPerfil && files.fotoPerfil.length > 0) {
      const uploadPerfil$ = from(
        this.uploadService.guardarFicheiro(
          files.fotoPerfil[0],
          'cidadaos/perfil',
        ),
      ).pipe(
        switchMap((res) => {
          request.body.fotoPerfil = res.nomeFicheiro;
          ficheirosGravadosComSucesso.push(res.caminhoFicheiro);
          return of(res);
        }),
      );
      tarefasUpload.push(uploadPerfil$);
    }

    // 2. Processar Múltiplas Fotos de Corpo Completo
    if (files?.fotosCorpoCompleto && files.fotosCorpoCompleto.length > 0) {
      const uploadsCorpo$ = forkJoin(
        files.fotosCorpoCompleto.map((file) =>
          from(
            this.uploadService.guardarFicheiro(file, 'cidadaos/corpo_completo'),
          ),
        ),
      ).pipe(
        switchMap((resultados) => {
          const nomes = resultados.map((r) => r.nomeFicheiro);
          request.body.fotosCorpoCompleto = nomes;
          ficheirosGravadosComSucesso.push(
            ...resultados.map((r) => r.caminhoFicheiro),
          );
          return of(resultados);
        }),
      );
      tarefasUpload.push(uploadsCorpo$);
    }

    if (tarefasUpload.length === 0) {
      return next.handle();
    }

    return forkJoin(tarefasUpload).pipe(
      switchMap(() => {
        // Disponibiliza a lista de caminhos para o interceptor de rollback (limpeza automática)
        request.ficheirosCarregadosSucesso = ficheirosGravadosComSucesso;
        return next.handle();
      }),
    );
  }
}
