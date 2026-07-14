import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DeficienciaService } from './deficiencia.service';
import {
  CriarDeficienciaDto,
  EditarDeficienciaDto,
  FiltroDeficienciaDto,
} from './dto/deficiencia.dto';
import { RolesPapelUtilizador } from '../../core/decorators/roles-papel-utilizador.decorator';
import { PapelUtilizador } from '../utilizador/enums/utilizador.enum';
import { IApiResponse } from '../../core/interfaces/api-response.interface';
import { Deficiencia } from './entities/deficiencia.entity';

@Controller('deficiencias')
export class DeficienciaController {
  constructor(private readonly deficienciaService: DeficienciaService) {}

  @Post()
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  async criar(
    @Body() dto: CriarDeficienciaDto,
  ): Promise<IApiResponse<Deficiencia>> {
    const deficiencia = await this.deficienciaService.criar(dto);
    return {
      message: 'Tipologia de deficiência registada com sucesso.',
      body: deficiencia,
    };
  }

  @Post(':id/editar')
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  async editar(
    @Param('id') id: string,
    @Body() dto: EditarDeficienciaDto,
  ): Promise<IApiResponse<Deficiencia>> {
    const deficiencia = await this.deficienciaService.editar(id, dto);
    return {
      message: 'Tipologia de deficiência atualizada com sucesso.',
      body: deficiencia,
    };
  }

  @Post(':id/eliminar')
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  async eliminar(@Param('id') id: string): Promise<IApiResponse<null>> {
    await this.deficienciaService.eliminar(id);
    return {
      message: 'Tipologia de deficiência removida com sucesso.',
      body: null,
    };
  }

  @Get(':id')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
    PapelUtilizador.CADASTRADOR,
  )
  @HttpCode(HttpStatus.OK)
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<IApiResponse<Deficiencia>> {
    const deficiencia = await this.deficienciaService.buscarPorId(id);
    return {
      message: 'Tipologia de deficiência localizada com sucesso.',
      body: deficiencia,
    };
  }

  @Get()
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
    PapelUtilizador.CADASTRADOR,
    PapelUtilizador.CONSULTA,
  )
  @HttpCode(HttpStatus.OK)
  async listar(
    @Query() filtro: FiltroDeficienciaDto,
  ): Promise<IApiResponse<Deficiencia[]>> {
    const paginado = await this.deficienciaService.listar(filtro);
    return {
      message: 'Lista de tipologias de deficiência recuperada com sucesso.',
      body: paginado.items,
      paginacao: {
        pagina: paginado.meta.currentPage,
        totalItens: paginado.meta.totalItems,
        totalPaginas: paginado.meta.totalPages,
        itensPorPagina: paginado.meta.itemCount,
      },
    };
  }
}
