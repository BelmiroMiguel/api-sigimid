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
  CriarBairroDto,
  EditarBairroDto,
  FiltroBairroDto,
} from './dto/geografia.dto';
import { Bairro } from './entities/bairro.entity';
import { GeografiaService } from './geografia.service';

@Controller('bairros')
export class BairroController {
  constructor(private readonly geografiaService: GeografiaService) {}

  @Post()
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
  )
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dto: CriarBairroDto): Promise<IApiResponse<Bairro>> {
    const bairro = await this.geografiaService.criarBairro(dto);
    return {
      message: 'Bairro registado com sucesso.',
      body: bairro,
    };
  }

  @Post(':id/editar')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
  )
  @HttpCode(HttpStatus.OK)
  async editar(
    @Param('id') id: string,
    @Body() dto: EditarBairroDto,
  ): Promise<IApiResponse<Bairro>> {
    const bairro = await this.geografiaService.editarBairro(id, dto);
    return {
      message: 'Dados do bairro atualizados com sucesso.',
      body: bairro,
    };
  }

  @Get(':id')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
    PapelUtilizador.CADASTRADOR,
  )
  @HttpCode(HttpStatus.OK)
  async buscarPorId(@Param('id') id: string): Promise<IApiResponse<Bairro>> {
    const bairro = await this.geografiaService.buscarBairroPorId(id);
    return {
      message: 'Bairro localizado com sucesso.',
      body: bairro,
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
    @Query() filtro: FiltroBairroDto,
  ): Promise<IApiResponse<Bairro[]>> {
    const paginado = await this.geografiaService.listarBairros(filtro);
    return {
      message: 'Lista de bairros recuperada com sucesso.',
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
