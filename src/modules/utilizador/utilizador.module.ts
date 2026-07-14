import { Module } from '@nestjs/common';
import { UtilizadorService } from './utilizador.service';
import { UtilizadorController } from './utilizador.controller';

@Module({
  imports: [],  
  controllers: [UtilizadorController],
  providers: [UtilizadorService],
  exports: [UtilizadorService],
})
export class UtilizadorModule {}
