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
import {
  CriarCondicaoEspecialDto,
  CriarDeficienciaDto,
  EditarDeficienciaDto,
  FiltroDeficienciaDto,
} from './dto/deficiencia.dto';
import { RolesPapelUtilizador } from '../../core/decorators/roles-papel-utilizador.decorator';
import { PapelUtilizador } from '../utilizador/enums/utilizador.enum';
import { IApiResponse } from '../../core/interfaces/api-response.interface';
import { Deficiencia } from './entities/deficiencia.entity';
import { CondicaoEspecialService } from './condicao-especial.service';
import { CondicaoEspecial } from './entities/condicao-especial.entity';

@Controller('condicoes-especiais')
@RolesPapelUtilizador(
  PapelUtilizador.ADMINISTRADOR,
  PapelUtilizador.CADASTRADOR,
  PapelUtilizador.SUPERVISOR,
)
export class CondicaoEspecialController {
  constructor(private readonly service: CondicaoEspecialService) {}

  @Post()
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  async criar(
    @Body() dto: CriarCondicaoEspecialDto,
  ): Promise<IApiResponse<CondicaoEspecial>> {
    const data = await this.service.criar(dto);
    return {
      message: 'Condicao especial registada com sucesso.',
      body: data,
    };
  }

  @Post(':id/editar')
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  async editar(
    @Param('id') id: string,
    @Body() dto: CriarCondicaoEspecialDto,
  ): Promise<IApiResponse<CondicaoEspecial>> {
    const data = await this.service.editar(id, dto);
    return {
      message: 'Condicao especial atualizada com sucesso.',
      body: data,
    };
  }

  @Post(':id/eliminar')
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  async eliminar(@Param('id') id: string): Promise<IApiResponse<null>> {
    await this.service.eliminar(id);
    return {
      message: 'Condicao especial removida com sucesso.',
      body: null,
    };
  }

  @Post(':id/restaurar')
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  async restaurar(
    @Param('id') id: string,
  ): Promise<IApiResponse<CondicaoEspecial>> {
    const ce = await this.service.restaurar(id);
    return {
      message: 'Condicao especial restaurada com sucesso.',
      body: ce,
    };
  }

  @Get('estatistica')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
    PapelUtilizador.CADASTRADOR,
  )
  @HttpCode(HttpStatus.OK)
  async obterEstatisticas(): Promise<
    IApiResponse<{ total: number; ativos: number; inativos: number }>
  > {
    const data = await this.service.obterEstatisticas();
    return {
      message: 'Condicao especial localizada com sucesso.',
      body: data,
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
  ): Promise<IApiResponse<CondicaoEspecial>> {
    const data = await this.service.buscarPorId(id);
    return {
      message: 'Condicao especial localizada com sucesso.',
      body: data,
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
  ): Promise<IApiResponse<CondicaoEspecial[]>> {
    const paginado = await this.service.listar(filtro);
    return {
      message: 'Lista de tipologias de deficiência recuperada com sucesso.',
      body: paginado.items,
      paginacao: {
        pagina: paginado.meta.currentPage,
        totalItens: paginado.meta.totalItems,
        totalPaginas: paginado.meta.totalPages,
        itensPorPagina: paginado.meta.itemsPerPage,
      },
    };
  }
}
