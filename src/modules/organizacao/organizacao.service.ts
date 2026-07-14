import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  EntityManagerHelper,
  QueryBuilderHelper,
} from '@2bbelmiro/typeorm-query-buider-helper';
import { ClsService } from 'nestjs-cls';
import { Organizacao } from './entities/organizacao.entity';
import {
  CriarOrganizacaoDto,
  EditarOrganizacaoDto,
  FiltroOrganizacaoDto,
} from './dto/organizacao.dto';
import { EstadoOrganizacao } from './enums/organizacao.enum';

@Injectable()
export class OrganizacaoService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly entityManagerHelper: EntityManagerHelper,
    private readonly cls: ClsService,
  ) {}

  async criar(dto: CriarOrganizacaoDto): Promise<Organizacao> {
    // Deduplicação de cadastro de forma Global (Angola)
    const nifExiste = await this.entityManagerHelper
      .createQueryBuilder(Organizacao, 'o')
      .whereEqual('o.identificacao', dto.identificacao)
      .whereNotEqual('o.estado', EstadoOrganizacao.ELIMINADO)
      .getOne();

    if (nifExiste) {
      throw new ConflictException(
        `Já se encontra registada uma organização com o NIF [${dto.identificacao}].`,
      );
    }

    const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

    return await this.entityManagerHelper.transaction(async (manager) => {
      const novaOrganizacao = manager.create(Organizacao, {
        descricao: dto.descricao,
        identificacao: dto.identificacao,
        idUltimaModificacao: idUtilizadorLogado,
      });

      return await manager.save(novaOrganizacao);
    });
  }

  async editar(id: string, dto: EditarOrganizacaoDto): Promise<Organizacao> {
    const organizacao = await this.buscarPorId(id);

    if (dto.identificacao && dto.identificacao !== organizacao.identificacao) {
      const nifExiste = await this.entityManagerHelper
        .createQueryBuilder(Organizacao, 'o')
        .whereEqual('o.identificacao', dto.identificacao)
        .whereNotEqual('o.idOrganizacao', id)
        .whereNotEqual('o.estado', EstadoOrganizacao.ELIMINADO)
        .getOne();

      if (nifExiste) {
        throw new ConflictException(
          `O NIF [${dto.identificacao}] já se encontra associado a outra organização ativa.`,
        );
      }
    }

    const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

    return await this.entityManagerHelper.transaction(async (manager) => {
      manager.merge(Organizacao, organizacao, {
        ...dto,
        idUltimaModificacao: idUtilizadorLogado,
      });

      return await manager.save(organizacao);
    });
  }

  async eliminar(id: string): Promise<void> {
    const organizacao = await this.buscarPorId(id);
    const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

    await this.entityManagerHelper.transaction(async (manager) => {
      organizacao.estado = EstadoOrganizacao.ELIMINADO;
      organizacao.dataEliminacao = new Date();
      organizacao.idUltimaModificacao = idUtilizadorLogado;

      await manager.save(organizacao);
    });
  }

  async buscarPorId(id: string): Promise<Organizacao> {
    const organizacao = await this.entityManagerHelper
      .createQueryBuilder(Organizacao, 'o')
      .whereEqual('o.idOrganizacao', id)
      .whereNotEqual('o.estado', EstadoOrganizacao.ELIMINADO)
      .getOne();

    if (!organizacao) {
      throw new NotFoundException(
        `A organização com o ID [${id}] não foi encontrada ou foi eliminada.`,
      );
    }

    return organizacao;
  }

  async listar(filtro: FiltroOrganizacaoDto) {
    // O helper condensa e simplifica o código, aplicando filtros apenas se os campos forem preenchidos (diferentes de null/undefined)
    const queryBuilder = this.entityManagerHelper
      .createQueryBuilder(Organizacao, 'o')
      .whereNotEqual('o.estado', EstadoOrganizacao.ELIMINADO)
      .whereLike('o.descricao', filtro.descricao)
      .whereEqual('o.identificacao', filtro.identificacao)
      .whereEqual('o.estado', filtro.estado)
      .orderBy('o.dataCriacao', 'DESC');

    return await queryBuilder.paginate({
      page: Number(filtro.pagina) || 1,
      limit: Number(filtro.itensPorPagina) || 10,
    });
  }
}
