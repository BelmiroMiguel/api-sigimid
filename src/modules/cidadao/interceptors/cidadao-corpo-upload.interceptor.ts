import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { UploadService } from '../../../core/upload/upload.service';

export const pathFotoCorpoCidadao = 'cidadaos/corpo_completo';

@Injectable()
export class CidadaoCorpoUploadInterceptor implements NestInterceptor {
  constructor(private readonly uploadService: UploadService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    // Captura o array de ficheiros
    const files = request.files as
      { fotosCorpoCompleto?: Express.Multer.File[] } | undefined;
    const fileArray = files?.fotosCorpoCompleto;

    // Se não houver upload, passa para o próximo passo
    if (!fileArray || fileArray.length === 0) {
      return next.handle();
    }

    // Cria um array de Promises/Observables para fazer o upload de cada foto
    const uploadPromises = fileArray.map((file) =>
      this.uploadService.guardarFicheiro(file, pathFotoCorpoCidadao),
    );

    // Executa todos os uploads em paralelo
    return from(Promise.all(uploadPromises)).pipe(
      switchMap((resultados) => {
        // Injeta a lista de caminhos/nomes gerados no body
        request.body.fotosCorpoCompleto = resultados.map(
          (res) => res.nomeFicheiro,
        );

        // Recupera a lista global de sucesso e faz o merge
        const ficheirosExistentes = request.ficheirosCarregadosSucesso || [];
        const novosCaminhos = resultados.map((res) => res.caminhoFicheiro);

        request.ficheirosCarregadosSucesso = [
          ...ficheirosExistentes,
          ...novosCaminhos,
        ];

        return next.handle();
      }),
    );
  }
}
