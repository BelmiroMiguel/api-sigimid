import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  UseInterceptors,
  Res,
  Delete,
} from '@nestjs/common';
import { UtilizadorService } from './utilizador.service';
import {
  CriarUtilizadorDto,
  EditarUtilizadorDto,
  LoginDto,
  FiltroUtilizadorDto,
  EditarSenhaUtilizadorDto,
} from './dto/utilizador.dto';
import { RolesPapelUtilizador } from '../../core/decorators/roles-papel-utilizador.decorator';
import { PapelUtilizador } from './enums/utilizador.enum';
import { Public } from '../../core/decorators/public.decorator';
import { IApiResponse } from '../../core/interfaces/api-response.interface';
import { Utilizador } from './entities/utilizador.entity';
import { FileCleanupInterceptor } from '../../core/interceptors/file-cleanup.interceptor';
import {
  pathFotoPerfilUtilizador,
  UtilizadorUploadInterceptor,
} from './interceptors/utilizador-upload.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../../core/upload/upload.service';
import { type Response } from 'express';

@Controller('utilizadores')
export class UtilizadorController {
  constructor(
    private readonly service: UtilizadorService,
    private readonly uploadService: UploadService,
  ) {}

  @Public()
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
  ): Promise<IApiResponse<Omit<Utilizador, 'senhaHash'>>> {
    const dadosSessao = await this.service.login(dto);
    return {
      message: 'Sessão iniciada com sucesso.',
      body: dadosSessao.utilizador,
      token: dadosSessao.accessToken,
    };
  }

  @Post()
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
  )
  @UseInterceptors(
    FileInterceptor('fotoPerfil'),
    UtilizadorUploadInterceptor,
    FileCleanupInterceptor,
  )
  @HttpCode(HttpStatus.CREATED)
  async criar(
    @Body() dto: CriarUtilizadorDto,
  ): Promise<IApiResponse<Omit<Utilizador, 'senhaHash'>>> {
    const utilizador = await this.service.criar(dto);
    const { senhaHash, ...resposta } = utilizador;
    return {
      message: 'Operador municipal registado com sucesso.',
      body: resposta,
    };
  }

  @Delete(':id/restaurar')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
  )
  @HttpCode(HttpStatus.OK)
  async restaurar(@Param('id') id: string): Promise<IApiResponse<null>> {
    await this.service.restaurar(id);
    return {
      message: 'Utilizador restaurado, o seu aceesao esta liberado.',
      body: null,
    };
  }

  @Delete(':id/eliminar')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
  )
  @HttpCode(HttpStatus.OK)
  async eliminar(@Param('id') id: string): Promise<IApiResponse<null>> {
    await this.service.eliminar(id);
    return {
      message: 'Utilizador dispensado, suas actividades foram bloqueadas.',
      body: null,
    };
  }

  @Post(':id/editar')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
  )
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('fotoPerfil'),
    UtilizadorUploadInterceptor,
    FileCleanupInterceptor,
  )
  async editar(
    @Param('id') id: string,
    @Body() dto: EditarUtilizadorDto,
  ): Promise<IApiResponse<Omit<Utilizador, 'senhaHash'>>> {
    const utilizador = await this.service.editar(id, dto);
    const { senhaHash, ...resposta } = utilizador;
    return {
      message: 'Utilizador atualizado com sucesso.',
      body: resposta,
    };
  }

  @Post(':id/editar/senha')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('fotoPerfil'),
    UtilizadorUploadInterceptor,
    FileCleanupInterceptor,
  )
  async editarSenha(
    @Param('id') id: string,
    @Body() dto: EditarSenhaUtilizadorDto,
  ): Promise<IApiResponse<Omit<Utilizador, 'senhaHash'>>> {
    const utilizador = await this.service.editarSenha(id, dto);
    const { senhaHash, ...resposta } = utilizador;
    return {
      message: 'A palavra-passe foi modificada com sucesso.',
      body: resposta,
    };
  }

  @Post(':id/foto-perfil')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
  )
  @HttpCode(HttpStatus.OK)
  async atualizarFotoPerfil(
    @Param('id') id: string,
    @Body('fotoPerfil') fotoPerfilPath: string,
  ): Promise<IApiResponse<string>> {
    const fotoPerfil = await this.service.atualizarFotoPerfil(
      id,
      fotoPerfilPath,
    );
    return {
      message: 'Fotografia de perfil atualizada com sucesso.',
      body: fotoPerfil,
    };
  }

  @Get('perfil')
  @HttpCode(HttpStatus.OK)
  async obterPerfil(
    @Req() req: any,
  ): Promise<IApiResponse<Omit<Utilizador, 'senhaHash'>>> {
    const utilizador = await this.service.buscarPorId(req.user.idUtilizador);
    const { senhaHash, ...resposta } = utilizador;
    return {
      message: 'Perfil do operador recuperado com sucesso.',
      body: resposta,
    };
  }

  @Get('perfil/:id')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
  )
  @HttpCode(HttpStatus.OK)
  async obterPorId(
    @Param('id') id: string,
  ): Promise<IApiResponse<Omit<Utilizador, 'senhaHash'>>> {
    const utilizador = await this.service.buscarPorId(id);
    const { senhaHash, ...resposta } = utilizador;
    return {
      message: 'Perfil do operador recuperado com sucesso.',
      body: resposta,
    };
  }

  @Get('estatistica')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
  )
  @HttpCode(HttpStatus.OK)
  async obterEstatisticas(): Promise<
    IApiResponse<{
      total: number;
      ativos: number;
      inativos: number;
      admins: number;
    }>
  > {
    const data = await this.service.obterEstatisticas();
    return {
      message: 'Estatística dos utilizadores.',
      body: data,
    };
  }

  @Get()
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
  )
  @HttpCode(HttpStatus.OK)
  async listar(
    @Query() filtro: FiltroUtilizadorDto,
  ): Promise<IApiResponse<Omit<Utilizador, 'senhaHash'>[]>> {
    const paginado = await this.service.listar(filtro);

    // Limpar hashes de senhas dos itens antes do envio
    const itensLimpos = paginado.items.map(
      ({ senhaHash, ...utilizador }) => utilizador,
    );

    return {
      message: 'Lista de operadores municipais recuperada com sucesso.',
      body: itensLimpos,
      paginacao: {
        pagina: paginado.meta.currentPage,
        totalItens: paginado.meta.totalItems,
        totalPaginas: paginado.meta.totalPages,
        itensPorPagina: paginado.meta.itemCount,
      },
    };
  }

  @Get('img/perfil/:nomeArquivo')
  @Public()
  servirFotoPerfil(
    @Param('nomeArquivo') nomeArquivo: string,
    @Res() res: Response,
  ) {
    const caminhoFisico = this.uploadService.obterCaminhoFisicoFicheiro(
      pathFotoPerfilUtilizador,
      nomeArquivo,
    );
    return res.sendFile(caminhoFisico);
  }
}
