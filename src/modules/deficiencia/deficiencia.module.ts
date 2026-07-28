import { Module } from '@nestjs/common';
import { DeficienciaService } from './deficiencia.service';
import { DeficienciaController } from './deficiencia.controller';
import { CondicaoEspecialService } from './condicao-especial.service';
import { CondicaoEspecialController } from './condicao-especial.controller';

@Module({
  controllers: [DeficienciaController, CondicaoEspecialController],
  providers: [DeficienciaService, CondicaoEspecialService],
  exports: [DeficienciaService, CondicaoEspecialService],
})
export class DeficienciaModule {}
