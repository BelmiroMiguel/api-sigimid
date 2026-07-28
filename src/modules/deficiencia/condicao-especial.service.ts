import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  EntityManagerHelper,
  QueryBuilderHelper,
} from '@2bbelmiro/typeorm-query-buider-helper';
import { ClsService } from 'nestjs-cls';
import {
  CriarCondicaoEspecialDto,
  FiltroCondicaoEspecialDto,
} from './dto/deficiencia.dto';
import { EstadoCondicaoEspecial } from './enums/deficiencia.enum';
import { PaginationResult } from '@2bbelmiro/typeorm-query-buider-helper';
import { CondicaoEspecial } from './entities/condicao-especial.entity';
import { PapelUtilizador } from '../utilizador/enums/utilizador.enum';
import { filter } from 'rxjs';

@Injectable()
export class CondicaoEspecialService {
  constructor(
    private readonly entityManagerHelper: EntityManagerHelper,
    private readonly cls: ClsService,
  ) {}

  async criar(dto: CriarCondicaoEspecialDto): Promise<CondicaoEspecial> {
    try {
      const existente = await this.entityManagerHelper
        .createQueryBuilder(CondicaoEspecial, 'ce')
        .whereEqual('ce.descricao', dto.descricao.trim().toLowerCase())
        .withDeleted()
        .getOne();

      if (existente) {
        throw new ConflictException(
          `Condição especial já se encontra cadastrada.`,
        );
      }
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        const novaCondicaoEspecial = manager.create(CondicaoEspecial, {
          descricao: dto.descricao.trim().toLowerCase(),
          idUltimaModificacao: idUtilizadorLogado,
        });

        return await manager.save(novaCondicaoEspecial);
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException(
        'Erro interno ao tentar registar a condição especial.',
      );
    }
  }

  async editar(
    id: string,
    dto: CriarCondicaoEspecialDto,
  ): Promise<CondicaoEspecial> {
    try {
      const condicaoEspecial = await this.buscarPorId(id);

      if (dto.descricao && dto.descricao !== condicaoEspecial.descricao) {
        const existente = await this.entityManagerHelper
          .createQueryBuilder(CondicaoEspecial, 'ce')
          .whereEqual('ce.descricao', dto.descricao.trim().toLowerCase())
          .whereNotEqual('ce.idCondicaoEspecial', id)
          .withDeleted()
          .getOne();

        if (existente) {
          throw new ConflictException(
            `Condição especial já se encontra registada.`,
          );
        }
      }

      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        manager.merge(CondicaoEspecial, condicaoEspecial, {
          ...dto,
          idUltimaModificacao: idUtilizadorLogado,
        });

        return await manager.save(condicaoEspecial);
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException(
        'Erro interno ao tentar atualizar a condição especial.',
      );
    }
  }

  async eliminar(id: string): Promise<void> {
    try {
      const condicaoEspecial = await this.buscarPorId(id);
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      await this.entityManagerHelper.transaction(async (manager) => {
        condicaoEspecial.estado = EstadoCondicaoEspecial.INATIVO;
        condicaoEspecial.dataEliminacao = new Date();
        condicaoEspecial.idUltimaModificacao = idUtilizadorLogado;

        await manager.save(condicaoEspecial);
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Erro interno ao tentar remover a condição especial.',
      );
    }
  }

  async restaurar(id: string): Promise<CondicaoEspecial> {
    try {
      const condicaoEspecial = await this.buscarPorId(id);
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        condicaoEspecial.estado = EstadoCondicaoEspecial.ATIVO;
        condicaoEspecial.dataEliminacao = undefined;
        condicaoEspecial.idUltimaModificacao = idUtilizadorLogado;

        return await manager.save(condicaoEspecial);
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Erro interno ao tentar restaurar a condição especial.',
      );
    }
  }

  async buscarPorId(id: string): Promise<CondicaoEspecial> {
    try {
      const deficiencia = await this.entityManagerHelper
        .createQueryBuilder(CondicaoEspecial, 'ce')
        .whereEqual('ce.idCondicaoEspecial', id)
        .withDeleted()
        .getOne();

      if (!deficiencia) {
        throw new NotFoundException(`Condição especial não localizada.`);
      }

      return deficiencia;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Erro ao carregar condição especial',
      );
    }
  }

  async listar(
    filtro: FiltroCondicaoEspecialDto,
  ): Promise<PaginationResult<CondicaoEspecial>> {
    try {
      const query = this.entityManagerHelper
        .createQueryBuilder(CondicaoEspecial, 'ce')
        .whereLike('ce.descricao', filtro.descricao?.trim().toLowerCase())
        .whereEqual('ce.estado', filtro.estado)
        .withDeleted();

      if (filtro.ordenacao && filtro.direction) {
        query.orderBy(`ce.${filtro.ordenacao}`, filtro.direction);
      } else {
        query.orderBy('ce.dataCriacao', 'DESC');
      }

      if (filtro.semPaginacao === true) {
        const items = await query.getMany();
        return {
          items,
          meta: {
            totalItems: items.length,
            itemCount: items.length,
            itemsPerPage: items.length,
            totalPages: 1,
            currentPage: 1,
          },
        };
      }

      return await query.paginate({
        page: Number(filtro.pagina) || 1,
        limit: Number(filtro.itensPorPagina) || 10,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao processar listagem de condições especiais.',
      );
    }
  }

  private obterQueryBaseContagemEstatistica(): QueryBuilderHelper<CondicaoEspecial> {
    const papelLogado = this.cls.get<PapelUtilizador>('papel');
    const idOrganizacaoLogada = this.cls.get<string>('idOrganizacao');

    const query = this.entityManagerHelper
      .createQueryBuilder(CondicaoEspecial, 'ce')
      .withDeleted();

    if (papelLogado !== PapelUtilizador.ADMINISTRADOR) {
      query.whereEqual('ce.idOrganizacao', idOrganizacaoLogada || '0');
    }

    return query;
  }

  async obterEstatisticas() {
    try {
      const total = await this.obterQueryBaseContagemEstatistica().getCount();

      const ativos = await this.obterQueryBaseContagemEstatistica()
        .whereEqual('ce.estado', EstadoCondicaoEspecial.ATIVO)
        .getCount();

      const inativos = await this.obterQueryBaseContagemEstatistica()
        .whereEqual('ce.estado', EstadoCondicaoEspecial.INATIVO)
        .getCount();

      return { total, ativos, inativos };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao processar as estatísticas do painel de condição especial.',
      );
    }
  }
}
