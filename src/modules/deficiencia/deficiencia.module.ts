import { Module } from '@nestjs/common';
import { DeficienciaService } from './deficiencia.service';
import { DeficienciaController } from './deficiencia.controller';

@Module({
  controllers: [DeficienciaController],
  providers: [DeficienciaService],
  exports: [DeficienciaService],
})
export class DeficienciaModule {}
