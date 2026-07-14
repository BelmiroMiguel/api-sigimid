import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { FiltroDashboardDto } from './dto/dashboard.dto';
import { RolesPapelUtilizador } from '../../core/decorators/roles-papel-utilizador.decorator';
import { PapelUtilizador } from '../utilizador/enums/utilizador.enum';
import { IApiResponse } from '../../core/interfaces/api-response.interface';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metricas')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
  )
  @HttpCode(HttpStatus.OK)
  async obterMetricas(
    @Query() filtro: FiltroDashboardDto,
  ): Promise<IApiResponse<Record<string, unknown>>> {
    const metricasConsolidadas =
      await this.dashboardService.obterMetricas(filtro);
    return {
      message:
        'Métricas analíticas consolidadas compiladas com sucesso para o período solicitado.',
      body: metricasConsolidadas,
    };
  }
}
