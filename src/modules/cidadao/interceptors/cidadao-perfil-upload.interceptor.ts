import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { UploadService } from '../../../core/upload/upload.service';

export const pathFotoPerfilCidadao = 'cidadaos/perfil';

@Injectable()
export class CidadaoPerfilUploadInterceptor implements NestInterceptor {
  constructor(private readonly uploadService: UploadService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    // Captura o ficheiro do campo fotoPerfil estruturado pelo FileFieldsInterceptor
    const files = request.files as
      { fotoPerfil?: Express.Multer.File[] } | undefined;
    const file = files?.fotoPerfil?.[0];

    // Se não houver upload deste campo neste request, passa silenciosamente ao próximo passo do pipeline
    if (!file) {
      return next.handle();
    }

    return from(
      this.uploadService.guardarFicheiro(file, pathFotoPerfilCidadao),
    ).pipe(
      switchMap((res) => {
        // Injeta o caminho gerado no body
        request.body.fotoPerfil = res.nomeFicheiro;

        // Recupera a lista existente e faz a mesclagem (merge) para não sobrescrever
        const ficheirosExistentes = request.ficheirosCarregadosSucesso || [];
        ficheirosExistentes.push(res.caminhoFicheiro);
        request.ficheirosCarregadosSucesso = ficheirosExistentes;

        return next.handle();
      }),
    );
  }
}
