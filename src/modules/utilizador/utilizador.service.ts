import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from 'nestjs-cls';
import {
  EntityManagerHelper,
  QueryBuilderHelper,
} from '@2bbelmiro/typeorm-query-buider-helper';
import * as bcrypt from 'bcrypt';
import { Utilizador } from './entities/utilizador.entity';
import { Organizacao } from '../organizacao/entities/organizacao.entity';
import {
  CriarUtilizadorDto,
  EditarUtilizadorDto,
  LoginDto,
  FiltroUtilizadorDto,
  EditarSenhaUtilizadorDto,
} from './dto/utilizador.dto';
import { EstadoUtilizador, PapelUtilizador } from './enums/utilizador.enum';
import { UploadService } from '../../core/upload/upload.service';

@Injectable()
export class UtilizadorService {
  private readonly logger = new Logger(UtilizadorService.name);

  constructor(
    private readonly entityManagerHelper: EntityManagerHelper,
    private readonly jwtService: JwtService,
    private readonly cls: ClsService,
    private readonly uploadService: UploadService,
  ) {}

  async criar(dto: CriarUtilizadorDto): Promise<Utilizador> {
    try {
      const idOrganizacao = this.cls.get<string>('idOrganizacao');
      const utilizadorLogado = this.cls.get<Utilizador>('utilizador');

      // 2. Validar duplicidade de e-mail de forma global
      const emailExiste = await this.entityManagerHelper
        .createQueryBuilder(Utilizador, 'u')
        .whereEqual('u.email', dto.email.toLocaleLowerCase().trim())
        .getOne();

      if (emailExiste) {
        throw new ConflictException(
          `O endereço de e-mail [${dto.email}] já se encontra registado.`,
        );
      }

      // 2. Validar duplicidade de e-mail de forma global
      const telefone = dto.telefone
        ?.replaceAll(' ', '')
        .replaceAll('+244', '')
        .replaceAll('(+244)', '')
        .replace(/^(\+244){0,1}\s{0,1}$/, '')
        .replaceAll(' ', '')
        .trim();

      const telefoneExiste = await this.entityManagerHelper
        .createQueryBuilder(Utilizador, 'u')
        .whereEqual('u.telefone', telefone)
        .getOne();

      if (telefoneExiste) {
        throw new ConflictException(
          `O telefone [${telefone}] já se encontra registado.`,
        );
      }

      if (
        dto.papel == PapelUtilizador.ADMINISTRADOR &&
        utilizadorLogado.papel != PapelUtilizador.ADMINISTRADOR
      ) {
        throw new BadRequestException(
          'Apenas administradores gerenciam perfil de acesso [Administrador].',
        );
      }

      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash('sigimid', salt);
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        const novoUtilizador = manager.create(Utilizador, {
          idOrganizacao: idOrganizacao,
          nomeCompleto: dto.nomeCompleto.trim().toUpperCase(),
          email: dto.email.trim().toLowerCase(),
          telefone: telefone,
          senhaHash,
          papel: dto.papel,
          fotoPerfil: dto.fotoPerfil,
          idUltimaModificacao: idUtilizadorLogado,
          idUtilizadorCriador: idUtilizadorLogado,
        });

        return await manager.save(novoUtilizador);
      });
    } catch (error) {
      this.logger.error(error);
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException(
        'Erro interno ao tentar registar utilizador.',
      );
    }
  }

  async editar(
    idUtilizador: string,
    dto: EditarUtilizadorDto,
  ): Promise<Utilizador> {
    try {
      const utilizador = await this.buscarPorId(idUtilizador);
      const utilizadorLogado = this.cls.get<Utilizador>('utilizador');

      if (
        utilizador.idUtilizador != utilizadorLogado.idUtilizador &&
        utilizador.papel == PapelUtilizador.ADMINISTRADOR &&
        utilizadorLogado?.papel != PapelUtilizador.ADMINISTRADOR
      ) {
        throw new BadRequestException(
          'Apenas administradores podem gerir este usuário.',
        );
      }

      if (utilizador.idUtilizador == utilizadorLogado.idUtilizador) {
        if (dto.papel && dto.papel != utilizador.papel) {
          throw new BadRequestException(
            'Não podes modificar o seu perfil de acesso.',
          );
        }
      }

      if (utilizador.idUtilizador != utilizadorLogado.idUtilizador) {
        if (
          dto.papel &&
          dto.papel != utilizador.papel &&
          dto.papel == PapelUtilizador.ADMINISTRADOR &&
          utilizadorLogado.papel != PapelUtilizador.ADMINISTRADOR
        ) {
          throw new BadRequestException(
            'Apenas administradores gerenciam perfil de acesso [Administrador].',
          );
        }
      }

      // Evitar colisões de e-mail se alterado
      if (dto.email && dto.email.toLowerCase().trim() !== utilizador.email) {
        const emailExiste = await this.entityManagerHelper
          .createQueryBuilder(Utilizador, 'u')
          .whereEqual('u.email', dto.email.toLocaleLowerCase().trim())
          .whereNotEqual('u.idUtilizador', idUtilizador)
          .getOne();

        if (emailExiste) {
          throw new ConflictException(
            `O e-mail [${dto.email}] já se encontra registrado.`,
          );
        }
      }

      const telefone = dto.telefone
        ?.replaceAll(' ', '')
        .replaceAll('+244', '')
        .replaceAll('(+244)', '')
        .replace(/^(\+244){0,1}\s{0,1}$/, '')
        .replaceAll(' ', '')
        .trim();

      if (telefone && telefone.trim().toLowerCase() !== utilizador.telefone) {
        const telefoneExiste = await this.entityManagerHelper
          .createQueryBuilder(Utilizador, 'u')
          .whereEqual('u.telefone', telefone)
          .whereNotEqual('u.idUtilizador', idUtilizador)
          .getOne();

        if (telefoneExiste) {
          throw new ConflictException(
            `O telefone [${telefone}] já se encontra registado.`,
          );
        }
      }

      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        const novoUtilizador: any = manager.create(Utilizador, {
          nomeCompleto: dto.nomeCompleto?.trim().toUpperCase(),
          email: dto.email?.trim().toLowerCase(),
          telefone: telefone,
          papel: dto.papel,
          fotoPerfil: dto.fotoPerfil,
          idUltimaModificacao: idUtilizadorLogado,
        });

        await manager.update(
          Utilizador,
          utilizador.idUtilizador,
          novoUtilizador,
        );

        return await this.buscarPorId(idUtilizador);
      });
    } catch (error) {
      this.logger.error(error);
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException(
        'Erro interno ao tentar atualizar dados do utilizador.',
      );
    }
  }

  async editarSenha(
    idUtilizador: string,
    dto: EditarSenhaUtilizadorDto,
  ): Promise<Utilizador> {
    try {
      const utilizador = await this.buscarPorId(idUtilizador);
      const utilizadorLogado = this.cls.get<Utilizador>('utilizador');

      if (
        utilizador.idUtilizador != utilizadorLogado.idUtilizador &&
        utilizador.papel == PapelUtilizador.ADMINISTRADOR &&
        utilizadorLogado?.papel != PapelUtilizador.ADMINISTRADOR
      ) {
        throw new BadRequestException(
          'Apenas administradores podem gerir este usuário.',
        );
      }

      const senhaValida = await bcrypt.compare(
        dto.senhaAtual,
        utilizador.senhaHash,
      );
      if (!senhaValida) {
        throw new UnauthorizedException('Credenciais de acesso incorretas.');
      }

      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(dto.novaSenha || 'sigimid', salt);

      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        const novoUtilizador: any = manager.create(Utilizador, {
          senhaHash,
          idUltimaModificacao: idUtilizadorLogado,
        });

        await manager.update(
          Utilizador,
          utilizador.idUtilizador,
          novoUtilizador,
        );

        return await this.buscarPorId(idUtilizador);
      });
    } catch (error) {
      this.logger.error(error);
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException(
        'Erro interno ao tentar senha do utilizador.',
      );
    }
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    utilizador: Omit<Utilizador, 'senhaHash'>;
  }> {
    try {
      const utilizador = await this.entityManagerHelper
        .createQueryBuilder(Utilizador, 'u')
        .whereEqual('u.email', dto.email)
        .getOne();

      if (
        !utilizador ||
        utilizador.estado === EstadoUtilizador.BANIDO ||
        utilizador.estado === EstadoUtilizador.INATIVO
      ) {
        throw new UnauthorizedException(
          'Credenciais de acesso incorretas ou conta suspensa.',
        );
      }

      const senhaValida = await bcrypt.compare(dto.senha, utilizador.senhaHash);
      if (!senhaValida) {
        throw new UnauthorizedException('Credenciais de acesso incorretas.');
      }

      const payload = {
        sub: utilizador.idUtilizador,
        email: utilizador.email,
        idOrganizacao: utilizador.idOrganizacao,
      };

      const token = await this.jwtService.signAsync(payload);

      // Remover hash da palavra-passe antes de retornar ao cliente
      const { senhaHash, ...utilizadorSemSenha } = utilizador;

      return {
        accessToken: token,
        utilizador: utilizadorSemSenha,
      };
    } catch (error) {
      this.logger.error(error);
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      )
        throw error;
      throw new InternalServerErrorException('Erro ao realizar login.');
    }
  }

  async buscarPorId(id: string): Promise<Utilizador> {
    const utilizador = await this.entityManagerHelper
      .createQueryBuilder(Utilizador, 'u')
      .leftJoinAndSelect('u.organizacao', 'o')
      .leftJoinAndSelect('u.utilizadorCriador', 'uc')
      .leftJoinAndSelect('u.utilizadorEditor', 'ue')
      .whereEqual('u.idUtilizador', id)
      .whereNotEqual('u.estado', EstadoUtilizador.BANIDO)
      .getOne();

    if (!utilizador) {
      throw new NotFoundException(
        `Utilizador com o ID [${id}] não localizado.`,
      );
    }

    return utilizador;
  }

  async eliminar(idUtilizador: string): Promise<void> {
    try {
      const utilizador = await this.buscarPorId(idUtilizador);
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');
      const utilizadorLogado = this.cls.get<Utilizador>('utilizador');

      if (idUtilizador == idUtilizadorLogado) {
        throw new BadRequestException('Não podes gerenciar sua própia conta');
      }

      if (
        utilizador.papel == PapelUtilizador.ADMINISTRADOR &&
        utilizadorLogado?.papel != PapelUtilizador.ADMINISTRADOR
      ) {
        throw new BadRequestException(
          'Apenas administradores podem gerir este usuário.',
        );
      }

      await this.entityManagerHelper.transaction(async (manager) => {
        utilizador.estado = EstadoUtilizador.INATIVO;
        utilizador.dataEliminacao = new Date();
        utilizador.idUltimaModificacao = idUtilizadorLogado;

        await manager.save(utilizador);
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException(
        'Erro ao tentar dispensar o utlizador.',
      );
    }
  }

  async restaurar(idUtilizador: string): Promise<Utilizador> {
    try {
      const utilizador = await this.buscarPorId(idUtilizador);
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');
      const utilizadorLogado = this.cls.get<Utilizador>('utilizador');

      if (idUtilizador == idUtilizadorLogado) {
        throw new BadRequestException('Não podes gerenciar sua própia conta');
      }

      if (
        utilizador.papel == PapelUtilizador.ADMINISTRADOR &&
        utilizadorLogado?.papel != PapelUtilizador.ADMINISTRADOR
      ) {
        throw new BadRequestException(
          'Apenas administradores podem gerir este usuário.',
        );
      }

      return await this.entityManagerHelper.transaction(async (manager) => {
        utilizador.estado = EstadoUtilizador.ATIVO;
        utilizador.dataEliminacao = undefined;
        utilizador.idUltimaModificacao = idUtilizadorLogado;

        return await manager.save(utilizador);
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException('Erro ao restaurar o utilizador.');
    }
  }

  async listar(filtro: FiltroUtilizadorDto) {
    try {
      const papelLogado = this.cls.get<PapelUtilizador>('papel');
      const idOrganizacaoLogada = this.cls.get<string>('idOrganizacao');

      const query = this.entityManagerHelper
        .createQueryBuilder(Utilizador, 'u')
        .leftJoinAndSelect('u.organizacao', 'o')
        .whereSearch(
          ['u.nomeCompleto', 'u.email', 'u.telefone'],
          filtro.filtroTexto,
        )
        .whereIn('u.papel', filtro.papelIn)
        .whereEqual('u.estado', filtro.estado)
        .orderBy('u.nomeCompleto', 'ASC');

      // Regra Crítica de Multi-Tenancy: Apenas administradores Globais podem visualizar utilizadores de outras Administrações Municipais
      if (papelLogado !== PapelUtilizador.ADMINISTRADOR) {
        query.whereEqual('u.idOrganizacao', idOrganizacaoLogada || '0');
      }

      return await query.paginate({
        page: Number(filtro.pagina) || 1,
        limit: Number(filtro.itensPorPagina) || 10,
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException(
        'Falha ao processar listagem dos utilizadores.',
      );
    }
  }

  async atualizarFotoPerfil(idUtilizador: string, novaFotoPerfil: string) {
    try {
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');
      const utilizador = await this.buscarPorId(idUtilizador);
      const fotoPerfilAntiga = utilizador.fotoPerfilBase;

      return await this.entityManagerHelper.transaction(async (manager) => {
        utilizador.fotoPerfil = novaFotoPerfil;
        utilizador.idUltimaModificacao = idUtilizadorLogado;
        const { fotoPerfil = novaFotoPerfil } = await manager.save(utilizador);

        // Remoção física da anterior
        if (fotoPerfilAntiga) {
          await this.uploadService.removerFicheiroFisico(fotoPerfilAntiga);
        }
        return fotoPerfil;
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Erro ao registar o caminho da imagem de perfil na base de dados.',
      );
    }
  }

  private obterQueryBaseContagemEstatistica(): QueryBuilderHelper<Utilizador> {
    const papelLogado = this.cls.get<PapelUtilizador>('papel');
    const idOrganizacaoLogada = this.cls.get<string>('idOrganizacao');

    const query = this.entityManagerHelper
      .createQueryBuilder(Utilizador, 'u')
      .withDeleted();

    if (papelLogado !== PapelUtilizador.ADMINISTRADOR) {
      query.whereEqual('u.idOrganizacao', idOrganizacaoLogada || '0');
    }

    return query;
  }

  async obterEstatisticas() {
    try {
      const total = await this.obterQueryBaseContagemEstatistica().getCount();

      const ativos = await this.obterQueryBaseContagemEstatistica()
        .whereEqual('u.estado', EstadoUtilizador.ATIVO)
        .getCount();

      const inativos = await this.obterQueryBaseContagemEstatistica()
        .whereEqual('u.estado', EstadoUtilizador.INATIVO)
        .getCount();

      const admins = await this.obterQueryBaseContagemEstatistica()
        .whereEqual('u.papel', PapelUtilizador.ADMINISTRADOR)
        .getCount();

      return { total, ativos, inativos, admins };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao processar as estatísticas do painel de utilizadores.',
      );
    }
  }
}
