import { Module } from '@nestjs/common';
import { CidadaoService } from './cidadao.service';
import { CidadaoController } from './cidadao.controller';

@Module({
  controllers: [CidadaoController],
  providers: [CidadaoService],
  exports: [CidadaoService],
})
export class CidadaoModule {}
