import { Module } from '@nestjs/common';
import { GeografiaService } from './geografia.service';
import { GeografiaController } from './geografia.controller';
import { BairroController } from './bairro.controller';
import { MunicipioController } from './municipio.controller';
import { ProvinciaController } from './provincia.controller';

@Module({
  controllers: [ProvinciaController, MunicipioController, BairroController],
  providers: [GeografiaService],
  exports: [GeografiaService],
})
export class GeografiaModule {}
