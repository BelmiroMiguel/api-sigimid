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
  CriarMunicipioDto,
  EditarMunicipioDto,
  FiltroMunicipioDto,
} from './dto/geografia.dto';
import { Municipio } from './entities/municipio.entity';
import { GeografiaService } from './geografia.service';

@Controller('municipios')
export class MunicipioController {
  constructor(private readonly geografiaService: GeografiaService) {}

  @Post()
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.CREATED)
  async criar(
    @Body() dto: CriarMunicipioDto,
  ): Promise<IApiResponse<Municipio>> {
    const municipio = await this.geografiaService.criarMunicipio(dto);
    return {
      message: 'Município registado com sucesso.',
      body: municipio,
    };
  }

  @Post(':id/editar')
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  async editar(
    @Param('id') id: string,
    @Body() dto: EditarMunicipioDto,
  ): Promise<IApiResponse<Municipio>> {
    const municipio = await this.geografiaService.editarMunicipio(id, dto);
    return {
      message: 'Dados do município atualizados com sucesso.',
      body: municipio,
    };
  }

  @Get(':id')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
    PapelUtilizador.CADASTRADOR,
  )
  @HttpCode(HttpStatus.OK)
  async buscarPorId(@Param('id') id: string): Promise<IApiResponse<Municipio>> {
    const municipio = await this.geografiaService.buscarMunicipioPorId(id);
    return {
      message: 'Município localizado com sucesso.',
      body: municipio,
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
    @Query() filtro: FiltroMunicipioDto,
  ): Promise<IApiResponse<Municipio[]>> {
    const paginado = await this.geografiaService.listarMunicipios(filtro);
    return {
      message: 'Lista de municípios recuperada com sucesso.',
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
