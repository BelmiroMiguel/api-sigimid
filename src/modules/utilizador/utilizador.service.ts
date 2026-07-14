import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from 'nestjs-cls';
import { EntityManagerHelper } from '@2bbelmiro/typeorm-query-buider-helper';
import * as bcrypt from 'bcrypt';
import { Utilizador } from './entities/utilizador.entity';
import { Organizacao } from '../organizacao/entities/organizacao.entity';
import {
  CriarUtilizadorDto,
  EditarUtilizadorDto,
  LoginDto,
  FiltroUtilizadorDto,
} from './dto/utilizador.dto';
import { EstadoUtilizador, PapelUtilizador } from './enums/utilizador.enum';
import { UploadService } from '../../core/upload/upload.service';

@Injectable()
export class UtilizadorService {
  constructor(
    private readonly entityManagerHelper: EntityManagerHelper,
    private readonly jwtService: JwtService,
    private readonly cls: ClsService,
    private readonly uploadService: UploadService,
  ) {}

  async criar(dto: CriarUtilizadorDto): Promise<Utilizador> {
    const idOrganizacao = this.cls.get<string>('idOrganizacao');

    // 1. Validar se a organização associada existe na base de dados
    const organizacao = await this.entityManagerHelper
      .createQueryBuilder(Organizacao, 'o')
      .whereEqual('o.idOrganizacao', idOrganizacao)
      .whereNotEqual('o.estado', 'ELIMINADO')
      .getOne();

    if (!organizacao) {
      throw new NotFoundException(
        `A Administração Municipal com o ID [${idOrganizacao}] não foi localizada.`,
      );
    }

    // 2. Validar duplicidade de e-mail de forma global
    const emailExiste = await this.entityManagerHelper
      .createQueryBuilder(Utilizador, 'u')
      .whereEqual('u.email', dto.email)
      .whereNotEqual('u.estado', EstadoUtilizador.BANIDO)
      .getOne();

    if (emailExiste) {
      throw new ConflictException(
        `O endereço de e-mail [${dto.email}] já se encontra registado.`,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(dto.senha, salt);
    const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

    return await this.entityManagerHelper.transaction(async (manager) => {
      const novoUtilizador = manager.create(Utilizador, {
        idOrganizacao: idOrganizacao,
        nomeCompleto: dto.nomeCompleto,
        email: dto.email,
        senhaHash,
        papel: dto.papel,
        idUltimaModificacao: idUtilizadorLogado,
      });

      return await manager.save(novoUtilizador);
    });
  }

  async editar(id: string, dto: EditarUtilizadorDto): Promise<Utilizador> {
    const utilizador = await this.buscarPorId(id);

    // Evitar colisões de e-mail se alterado
    if (dto.email && dto.email !== utilizador.email) {
      const emailExiste = await this.entityManagerHelper
        .createQueryBuilder(Utilizador, 'u')
        .whereEqual('u.email', dto.email)
        .whereNotEqual('u.idUtilizador', id)
        .getOne();

      if (emailExiste) {
        throw new ConflictException(
          `O e-mail [${dto.email}] já se encontra em utilização.`,
        );
      }
    }

    const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

    return await this.entityManagerHelper.transaction(async (manager) => {
      manager.merge(Utilizador, utilizador, {
        ...dto,
        idUltimaModificacao: idUtilizadorLogado,
      });

      return await manager.save(utilizador);
    });
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    utilizador: Omit<Utilizador, 'senhaHash'>;
  }> {
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
  }

  async buscarPorId(id: string): Promise<Utilizador> {
    const utilizador = await this.entityManagerHelper
      .createQueryBuilder(Utilizador, 'u')
      .leftJoinAndSelect('u.organizacao', 'o')
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

  async listar(filtro: FiltroUtilizadorDto) {
    const papelLogado = this.cls.get<PapelUtilizador>('papel');
    const idOrganizacaoLogada = this.cls.get<string>('idOrganizacao');

    const query = this.entityManagerHelper
      .createQueryBuilder(Utilizador, 'u')
      .leftJoinAndSelect('u.organizacao', 'o')
      .whereNotEqual('u.estado', EstadoUtilizador.BANIDO)
      .whereLike('u.nomeCompleto', filtro.nomeCompleto)
      .whereEqual('u.email', filtro.email)
      .whereEqual('u.papel', filtro.papel)
      .whereEqual('u.estado', filtro.estado)
      .orderBy('u.dataCriacao', 'DESC');

    // Regra Crítica de Multi-Tenancy: Apenas Administradores Globais podem visualizar utilizadores de outras Administrações Municipais
    if (papelLogado !== PapelUtilizador.ADMINISTRADOR) {
      query.whereEqual('u.idOrganizacao', idOrganizacaoLogada || '0');
    }

    return await query.paginate({
      page: Number(filtro.pagina) || 1,
      limit: Number(filtro.itensPorPagina) || 10,
    });
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
}
