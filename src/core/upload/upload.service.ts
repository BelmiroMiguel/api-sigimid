import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import 'multer';

@Injectable()
export class UploadService {
  private readonly pastaRaizUpload = path.resolve(process.cwd(), 'uploads');
  private readonly mimeTypesPermitidos = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
  ];

  async guardarFicheiro(
    file: Express.Multer.File,
    subpastaContexto: string,
  ): Promise<{
    nomeFicheiro: string;
    caminhoFicheiro: string;
    nomeOriginal: string;
    mimeType: string;
  }> {
    try {
      // 1. Validar MimeType
      if (!this.mimeTypesPermitidos.includes(file.mimetype)) {
        throw new BadRequestException(
          `Formato de imagem inválido [${file.mimetype}]. Apenas são permitidos formatos JPEG, PNG e WEBP.`,
        );
      }

      // 2. Criar estrutura física de diretórios se não existir
      const pastaDestinoFinal = path.join(
        this.pastaRaizUpload,
        subpastaContexto,
      );
      if (!fs.existsSync(pastaDestinoFinal)) {
        fs.mkdirSync(pastaDestinoFinal, { recursive: true });
      }

      // 3. Gerar nome de ficheiro encriptado e seguro (UUID) preservando a extensão
      const extensao = path.extname(file.originalname).toLowerCase();
      const nomeFicheiroSeguro = `${uuidv4()}${extensao}`;
      const caminhoCompletoDoFicheiro = path.join(
        pastaDestinoFinal,
        nomeFicheiroSeguro,
      );

      // 4. Escrever o Buffer físico no disco do servidor
      fs.writeFileSync(
        this.caminCompletoDoFicheiro(caminhoCompletoDoFicheiro),
        file.buffer,
      );

      // Retorna o caminho relativo coeso para armazenamento em BD
      const caminhoRelativoBD = path
        .join('uploads', subpastaContexto, nomeFicheiroSeguro)
        .replace(/\\/g, '/');

      return {
        nomeFicheiro: nomeFicheiroSeguro,
        caminhoFicheiro: caminhoRelativoBD,
        nomeOriginal: file.originalname,
        mimeType: file.mimetype,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'Falha física de escrita do ficheiro de imagem no disco.',
      );
    }
  }

  // Método auxiliar simples para normalizar caminhos de escrita
  private caminCompletoDoFicheiro(caminho: string): string {
    return path.resolve(caminho);
  }

  async removerFicheiroFisico(caminhoRelativo: string): Promise<void> {
    try {
      const caminhoFisicoCompleto = path.resolve(
        process.cwd(),
        caminhoRelativo,
      );

      if (fs.existsSync(caminhoFisicoCompleto)) {
        await fs.promises.unlink(caminhoFisicoCompleto);
      }
    } catch (error) {
      // Registo de aviso sem derrubar o request primário (processo em background)
      console.warn(
        `Aviso de Limpeza: Não foi possível remover fisicamente o ficheiro: [${caminhoRelativo}].`,
      );
    }
  }

  public carregarUrlBaseFicheiro(subRota: string, nomeFicheiro?: string) {
    const baseUrl = process.env.BASE_URL;
    const ficheiro = nomeFicheiro ?? 'default.png';
    return `${baseUrl}/${subRota}/${ficheiro}`;
  }
}
