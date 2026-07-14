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
import { OrganizacaoService } from './organizacao.service';
import {
  CriarOrganizacaoDto,
  EditarOrganizacaoDto,
  FiltroOrganizacaoDto,
} from './dto/organizacao.dto';
import { RolesPapelUtilizador } from '../../core/decorators/roles-papel-utilizador.decorator';
import { PapelUtilizador } from '../utilizador/enums/utilizador.enum';
import { IApiResponse } from '../../core/interfaces/api-response.interface';
import { Organizacao } from './entities/organizacao.entity';

@Controller('organizacao')
export class OrganizacaoController {
  constructor(private readonly organizacaoService: OrganizacaoService) {}

  @Post()
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  async criar(
    @Body() dto: CriarOrganizacaoDto,
  ): Promise<IApiResponse<Organizacao>> {
    const organizacao = await this.organizacaoService.criar(dto);
    return {
      message: 'Administração Municipal registada com sucesso.',
      body: organizacao,
    };
  }

  @Post(':id/editar')
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  async editar(
    @Param('id') id: string,
    @Body() dto: EditarOrganizacaoDto,
  ): Promise<IApiResponse<Organizacao>> {
    const organizacaoUpdated = await this.organizacaoService.editar(id, dto);
    return {
      message: 'Dados da Administração Municipal atualizados com sucesso.',
      body: organizacaoUpdated,
    };
  }

  @Post(':id/eliminar')
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  async eliminar(@Param('id') id: string): Promise<IApiResponse<null>> {
    await this.organizacaoService.eliminar(id);
    return {
      message: 'Administração Municipal removida logicamente com sucesso.',
      body: null,
    };
  }

  @Get(':id')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
  )
  @HttpCode(HttpStatus.OK)
  async buscarPorId(
    @Param('id') id: string,
  ): Promise<IApiResponse<Organizacao>> {
    const organizacao = await this.organizacaoService.buscarPorId(id);
    return {
      message: 'Organização localizada com sucesso.',
      body: organizacao,
    };
  }

  @Get()
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
  )
  @HttpCode(HttpStatus.OK)
  async listar(
    @Query() filtro: FiltroOrganizacaoDto,
  ): Promise<IApiResponse<Organizacao[]>> {
    const paginado = await this.organizacaoService.listar(filtro);
    return {
      message: 'Lista de administrações municipais recuperada com sucesso.',
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
