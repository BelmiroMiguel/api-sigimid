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
} from '@nestjs/common';
import { UtilizadorService } from './utilizador.service';
import {
  CriarUtilizadorDto,
  EditarUtilizadorDto,
  LoginDto,
  FiltroUtilizadorDto,
} from './dto/utilizador.dto';
import { RolesPapelUtilizador } from '../../core/decorators/roles-papel-utilizador.decorator';
import { PapelUtilizador } from './enums/utilizador.enum';
import { Public } from '../../core/decorators/public.decorator';
import { IApiResponse } from '../../core/interfaces/api-response.interface';
import { Utilizador } from './entities/utilizador.entity';
import { FileCleanupInterceptor } from '../../core/interceptors/file-cleanup.interceptor';
import { UtilizadorUploadInterceptor } from './interceptors/utilizador-upload.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('utilizadores')
export class UtilizadorController {
  constructor(private readonly utilizadorService: UtilizadorService) {}

  @Public()
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
  ): Promise<IApiResponse<Omit<Utilizador, 'senhaHash'>>> {
    const dadosSessao = await this.utilizadorService.login(dto);
    return {
      message: 'Sessão iniciada com sucesso.',
      body: dadosSessao.utilizador,
      token: dadosSessao.accessToken,
    };
  }

  @Post()
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @UseInterceptors(
    FileInterceptor('fotoPerfil'),
    UtilizadorUploadInterceptor,
    FileCleanupInterceptor,
  )
  @HttpCode(HttpStatus.CREATED)
  async criar(
    @Body() dto: CriarUtilizadorDto,
  ): Promise<IApiResponse<Omit<Utilizador, 'senhaHash'>>> {
    const utilizador = await this.utilizadorService.criar(dto);
    const { senhaHash, ...resposta } = utilizador;
    return {
      message: 'Operador municipal registado com sucesso.',
      body: resposta,
    };
  }

  @Post(':id/editar')
  @RolesPapelUtilizador(PapelUtilizador.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  async editar(
    @Param('id') id: string,
    @Body() dto: EditarUtilizadorDto,
  ): Promise<IApiResponse<Omit<Utilizador, 'senhaHash'>>> {
    const utilizador = await this.utilizadorService.editar(id, dto);
    const { senhaHash, ...resposta } = utilizador;
    return {
      message: 'Utilizador atualizado com sucesso.',
      body: resposta,
    };
  }

  @Post(':id/foto-perfil')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
    PapelUtilizador.CADASTRADOR,
  )
  @HttpCode(HttpStatus.OK)
  async atualizarFotoPerfil(
    @Param('id') id: string,
    @Body('fotoPerfil') fotoPerfilPath: string,
  ): Promise<IApiResponse<string>> {
    const fotoPerfil = await this.utilizadorService.atualizarFotoPerfil(
      id,
      fotoPerfilPath,
    );
    return {
      message: 'Fotografia de perfil atualizada com sucesso.',
      body: fotoPerfil,
    };
  }

  @Get('perfil/me')
  @HttpCode(HttpStatus.OK)
  async obterPerfil(
    @Req() req: any,
  ): Promise<IApiResponse<Omit<Utilizador, 'senhaHash'>>> {
    const utilizador = await this.utilizadorService.buscarPorId(
      req.user.idUtilizador,
    );
    const { senhaHash, ...resposta } = utilizador;
    return {
      message: 'Perfil do operador recuperado com sucesso.',
      body: resposta,
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
    const paginado = await this.utilizadorService.listar(filtro);

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
}
