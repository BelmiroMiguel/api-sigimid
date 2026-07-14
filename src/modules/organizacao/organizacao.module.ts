import { Module } from '@nestjs/common';
import { OrganizacaoService } from './organizacao.service';
import { OrganizacaoController } from './organizacao.controller';

@Module({
  controllers: [OrganizacaoController],
  providers: [OrganizacaoService],
  exports: [OrganizacaoService],
})
export class OrganizacaoModule {}
