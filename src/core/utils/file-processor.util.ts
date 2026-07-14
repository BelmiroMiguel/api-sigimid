import { Injectable } from '@nestjs/common';
import { type Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileProcessor {
  private readonly rootPath = path.resolve(__dirname, '..', '..', 'uploads');

  guardarFicheiro(
    pasta: string,
    uuid: string,
    ficheiro: Express.Multer.File,
  ): string {
    const destino = path.join(this.rootPath, pasta, uuid);
    if (!fs.existsSync(destino)) fs.mkdirSync(destino, { recursive: true });

    const nomeFicheiro = `${Date.now()}-${ficheiro.originalname}`;
    const caminhoCompleto = path.join(destino, nomeFicheiro);

    fs.writeFileSync(caminhoCompleto, ficheiro.buffer);
    return `/${pasta}/${uuid}/${nomeFicheiro}`;
  }

  obterAvatarDefault(nome: string): string {
    const iniciais = nome
      .split(' ')
      .map((n) => n[0])
      .join('+')
      .toUpperCase();
    return `https://ui-avatars.com/api/?name=${iniciais}&background=random&color=fff`;
  }
}
