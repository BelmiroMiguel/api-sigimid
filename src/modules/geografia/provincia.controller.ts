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
import { RolesPapelUtilizador } from '../../core/decorators/roles-papel-utilizador.decorator';
import { IApiResponse } from '../../core/interfaces/api-response.interface';
import { PapelUtilizador } from '../utilizador/enums/utilizador.enum';
import {
  CriarProvinciaDto,
  EditarProvinciaDto,
  FiltroProvinciaDto,
} from './dto/geografia.dto';
import { Provincia } from './entities/provincia.entity';
import { GeografiaService } from './geografia.service';

@Controller('provincias')
export class ProvinciaController {
  constructor(private readonly geografiaService: GeografiaService) {}

  @Post()
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  async criar(
    @Body() dto: CriarProvinciaDto,
  ): Promise<IApiResponse<Provincia>> {
    const provincia = await this.geografiaService.criarProvincia(dto);
    return {
      message: 'Província registada com sucesso.',
      body: provincia,
    };
  }

  @Post(':id/editar')
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  async editar(
    @Param('id') id: string,
    @Body() dto: EditarProvinciaDto,
  ): Promise<IApiResponse<Provincia>> {
    const provincia = await this.geografiaService.editarProvincia(id, dto);
    return {
      message: 'Dados da província atualizados com sucesso.',
      body: provincia,
    };
  }

  @Get(':id')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
    PapelUtilizador.CADASTRADOR,
  )
  @HttpCode(HttpStatus.OK)
  async buscarPorId(@Param('id') id: string): Promise<IApiResponse<Provincia>> {
    const provincia = await this.geografiaService.buscarProvinciaPorId(id);
    return {
      message: 'Província localizada com sucesso.',
      body: provincia,
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
    @Query() filtro: FiltroProvinciaDto,
  ): Promise<IApiResponse<Provincia[]>> {
    const paginado = await this.geografiaService.listarProvincias(filtro);
    return {
      message: 'Lista de províncias recuperada com sucesso.',
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
