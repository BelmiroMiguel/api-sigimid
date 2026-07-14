import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UtilizadorModule } from './modules/utilizador/utilizador.module';
import { CoreModule } from './core/core.module';
import { OrganizacaoModule } from './modules/organizacao/organizacao.module';
import { GeografiaModule } from './modules/geografia/geografia.module';
import { DeficienciaModule } from './modules/deficiencia/deficiencia.module';
import { CidadaoModule } from './modules/cidadao/cidadao.module';
import { MediaModule } from './modules/media/media.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    CoreModule,
    UtilizadorModule,
    OrganizacaoModule,
    GeografiaModule,
    DeficienciaModule,
    CidadaoModule,
    MediaModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
