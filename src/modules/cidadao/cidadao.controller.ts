import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { type Response } from 'express';
import { CidadaoService } from './cidadao.service';
import {
  CriarCidadaoDto,
  EditarCidadaoDto,
  FiltroCidadaoDto,
  ExportarCidadaoDto,
} from './dto/cidadao.dto';
import { RolesPapelUtilizador } from '../../core/decorators/roles-papel-utilizador.decorator';
import { PapelUtilizador } from '../utilizador/enums/utilizador.enum';
import { IApiResponse } from '../../core/interfaces/api-response.interface';
import { Cidadao } from './entities/cidadao.entity';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileCleanupInterceptor } from '../../core/interceptors/file-cleanup.interceptor';
import {
  CidadaoCorpoUploadInterceptor,
  pathFotoCorpoCidadao,
} from './interceptors/cidadao-corpo-upload.interceptor';
import {
  CidadaoPerfilUploadInterceptor,
  pathFotoPerfilCidadao,
} from './interceptors/cidadao-perfil-upload.interceptor';
import { Public } from '../../core/decorators/public.decorator';
import { UploadService } from '../../core/upload/upload.service';

@Controller('cidadaos')
export class CidadaoController {
  constructor(
    private readonly cidadaoService: CidadaoService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
    PapelUtilizador.CADASTRADOR,
  )
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'fotoPerfil', maxCount: 1 },
      { name: 'fotosCorpoCompleto', maxCount: 5 },
    ]),
    CidadaoPerfilUploadInterceptor,
    CidadaoCorpoUploadInterceptor,
    FileCleanupInterceptor,
  )
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dto: CriarCidadaoDto): Promise<IApiResponse<Cidadao>> {
    const cidadao = await this.cidadaoService.criar(dto);
    return {
      message: 'Registo do cidadão gravado com sucesso.',
      body: cidadao,
    };
  }

  @Post(':id/editar')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
    PapelUtilizador.CADASTRADOR,
  )
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'fotoPerfil', maxCount: 1 },
      { name: 'fotosCorpoCompleto', maxCount: 5 },
    ]),
    CidadaoPerfilUploadInterceptor,
    CidadaoCorpoUploadInterceptor,
    FileCleanupInterceptor,
  )
  @HttpCode(HttpStatus.OK)
  async editar(
    @Param('id') id: string,
    @Body() dto: EditarCidadaoDto,
  ): Promise<IApiResponse<Cidadao>> {
    const cidadao = await this.cidadaoService.editar(id, dto);
    return {
      message: 'Ficha do cidadão atualizada com sucesso.',
      body: cidadao,
    };
  }

  @Post(':id/eliminar')
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  async eliminar(@Param('id') id: string): Promise<IApiResponse<null>> {
    await this.cidadaoService.eliminar(id);
    return {
      message: 'Ficha do cidadão eliminada logicamente com sucesso.',
      body: null,
    };
  }

  @Post('exportar')
  @Public()
  async exportarExcel(
    @Body() dto: ExportarCidadaoDto,
    @Res() res: Response,
  ): Promise<void> {
    const a = await this.cidadaoService.exportarExcelProgressivo(dto, res);
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
    @Query() filtro: FiltroCidadaoDto,
  ): Promise<IApiResponse<Cidadao[]>> {
    const paginado = await this.cidadaoService.listar(filtro);
    return {
      message: 'Lista de cidadãos registados recuperada com sucesso.',
      body: paginado.items,
      paginacao: {
        pagina: paginado.meta.currentPage,
        totalItens: paginado.meta.totalItems,
        totalPaginas: paginado.meta.totalPages,
        itensPorPagina: paginado.meta.itemCount,
      },
    };
  }

  @Get('estatisticas')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
    PapelUtilizador.CADASTRADOR,
    PapelUtilizador.CONSULTA,
  )
  @HttpCode(HttpStatus.OK)
  async obterEstatisticas(): Promise<IApiResponse<any>> {
    const estatisticas = await this.cidadaoService.obterEstatisticasCards();
    return {
      message: 'Estatísticas do painel recuperadas com sucesso.',
      body: estatisticas,
    };
  }

  @Get(':id')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
    PapelUtilizador.CADASTRADOR,
    PapelUtilizador.CONSULTA,
  )
  @HttpCode(HttpStatus.OK)
  async buscarPorId(@Param('id') id: string): Promise<IApiResponse<Cidadao>> {
    const cidadao = await this.cidadaoService.buscarPorId(id);
    return {
      message: 'Ficha do cidadão localizada com sucesso.',
      body: cidadao,
    };
  }

  @Get('img/perfil/:nomeArquivo')
  @Public()
  servirFotoPerfil(
    @Param('nomeArquivo') nomeArquivo: string,
    @Res() res: Response,
  ) {
    const caminhoFisico = this.uploadService.obterCaminhoFisicoFicheiro(
      pathFotoPerfilCidadao,
      nomeArquivo,
    );
    return res.sendFile(caminhoFisico);
  }

  @Get('img/corpo/:nomeArquivo')
  @Public()
  servirFotoCorpo(
    @Param('nomeArquivo') nomeArquivo: string,
    @Res() res: Response,
  ) {
    const caminhoFisico = this.uploadService.obterCaminhoFisicoFicheiro(
      pathFotoCorpoCidadao,
      nomeArquivo,
    );
    return res.sendFile(caminhoFisico);
  }
}
