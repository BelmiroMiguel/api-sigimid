import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  EntityManagerHelper,
  QueryBuilderHelper,
} from '@2bbelmiro/typeorm-query-buider-helper';
import { ClsService } from 'nestjs-cls';
import { Deficiencia } from './entities/deficiencia.entity';
import {
  CriarDeficienciaDto,
  EditarDeficienciaDto,
  FiltroDeficienciaDto,
} from './dto/deficiencia.dto';
import { EstadoDeficiencia } from './enums/deficiencia.enum';
import { BadRequestException } from '@nestjs/common';
import { GrauDeficiencia } from './entities/grau-deficiencia.entity';
import { PaginationResult } from '@2bbelmiro/typeorm-query-buider-helper';
import { PapelUtilizador } from '../utilizador/enums/utilizador.enum';
import { CidadaoDeficiencia } from '../cidadao/entities/cidadao-deficiencia.entity';

@Injectable()
export class DeficienciaService {
  private readonly logger = new Logger(DeficienciaService.name);

  constructor(
    private readonly entityManagerHelper: EntityManagerHelper,
    private readonly cls: ClsService,
  ) {}

  async criar(dto: CriarDeficienciaDto): Promise<Deficiencia> {
    try {
      const deficienciaExiste = await this.entityManagerHelper
        .createQueryBuilder(Deficiencia, 'd')
        .whereEqual('d.descricao', dto.descricao.trim().toLowerCase())
        .withDeleted()
        .getOne();

      if (deficienciaExiste) {
        throw new ConflictException(
          `A tipologia de deficiência [${dto.descricao}] já se encontra cadastrada.`,
        );
      }

      if (dto.graus.length <= 0) {
        throw new BadRequestException(
          `Adicione pelo menos um grau a deficiência.`,
        );
      }
      if (dto.graus.length > 4) {
        throw new BadRequestException(
          `São permitidos apenas 4 graus de deficiência.`,
        );
      }

      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        const novaDeficiencia = manager.create(Deficiencia, {
          descricao: dto.descricao.trim().toLowerCase(),
          idUltimaModificacao: idUtilizadorLogado,
        });

        const { idDeficiencia } = await manager.save(novaDeficiencia);

        for (let index = 0; index < dto.graus.length; index++) {
          const grau = dto.graus[index];
          const novoGrau = manager.create(GrauDeficiencia, {
            descricao: grau.trim().toLowerCase(),
            idDeficiencia: idDeficiencia,
            idUltimaModificacao: idUtilizadorLogado,
          });
          await manager.save(GrauDeficiencia, novoGrau);
        }

        return await this.buscarPorId(idDeficiencia, manager);
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
        'Erro interno ao tentar registar a tipologia de deficiência.',
      );
    }
  }

  async editar(
    idDeficiencia: string,
    dto: EditarDeficienciaDto,
  ): Promise<Deficiencia> {
    try {
      const deficiencia = await this.buscarPorId(
        idDeficiencia,
        undefined,
        true,
      );

      if (dto.graus.length > 4) {
        throw new BadRequestException(
          `São permitidos apenas 4 graus de deficiência.`,
        );
      }

      if (
        dto.descricao &&
        dto.descricao.trim().toLowerCase() !==
          deficiencia.descricao.trim().toLowerCase()
      ) {
        const descricaoExiste = await this.entityManagerHelper
          .createQueryBuilder(Deficiencia, 'd')
          .leftJoinAndSelect('d.graus', 'gd')
          .whereEqual('d.descricao', dto.descricao.trim().toLowerCase())
          .whereNotEqual('d.idDeficiencia', idDeficiencia)
          .whereNull('d.dataEliminacao')
          .getOne();

        if (descricaoExiste) {
          throw new ConflictException(
            `A tipologia de deficiência [${dto.descricao}] já se encontra registada.`,
          );
        }
      }

      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        const novaDef: any = manager.create(Deficiencia, {
          descricao: dto.descricao?.trim().toLowerCase(),
          idUltimaModificacao: idUtilizadorLogado,
        });
        await manager.update(Deficiencia, idDeficiencia, novaDef);

        for (let index = 0; index < dto.graus.length; index++) {
          const grau = dto.graus[index].trim().toLowerCase();
          if (
            deficiencia.graus?.some(
              (g) => g.descricao.trim().toLowerCase() == grau,
            )
          ) {
            const grauDf = deficiencia.graus.find(
              (g) => g.descricao.trim().toLowerCase() == grau,
            )!;
            if (grauDf.estado == EstadoDeficiencia.INATIVO) {
              await manager.update(GrauDeficiencia, grauDf.idGrauDeficiencia, {
                estado: EstadoDeficiencia.ATIVO,
              });
            }
            continue;
          }

          const novoGrau = manager.create(GrauDeficiencia, {
            descricao: grau.trim().toLowerCase(),
            idDeficiencia: idDeficiencia,
            idUltimaModificacao: idUtilizadorLogado,
          });
          await manager.save(GrauDeficiencia, novoGrau);
        }

        const grausInativos = deficiencia.graus?.filter(
          (g) =>
            !dto.graus.some(
              (gd) =>
                gd.trim().toLowerCase() == g.descricao.trim().toLowerCase(),
            ),
        );
        for (let index = 0; index < grausInativos.length; index++) {
          const grau = grausInativos[index];
          await manager.update(GrauDeficiencia, grau.idGrauDeficiencia, {
            estado: EstadoDeficiencia.INATIVO,
          });
        }

        return await this.buscarPorId(idDeficiencia, manager);
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
        'Erro interno ao tentar atualizar a tipologia de deficiência.',
      );
    }
  }

  async eliminar(idDeficiencia: string): Promise<void> {
    try {
      const deficiencia = await this.buscarPorId(idDeficiencia);
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      await this.entityManagerHelper.transaction(async (manager) => {
        deficiencia.estado = EstadoDeficiencia.INATIVO;
        deficiencia.dataEliminacao = new Date();
        deficiencia.idUltimaModificacao = idUtilizadorLogado;

        await manager.save(deficiencia);
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Erro interno ao tentar remover a tipologia de deficiência.',
      );
    }
  }

  async restaurar(idDeficiencia: string): Promise<Deficiencia> {
    try {
      const deficiencia = await this.buscarPorId(idDeficiencia);
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        deficiencia.estado = EstadoDeficiencia.ATIVO;
        deficiencia.dataEliminacao = undefined;
        deficiencia.idUltimaModificacao = idUtilizadorLogado;

        return await manager.save(deficiencia);
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Erro interno ao tentar restaurar a tipologia de deficiência.',
      );
    }
  }

  async buscarPorId(
    id: string,
    manager?: EntityManagerHelper,
    allGrauEstado = false,
  ): Promise<Deficiencia> {
    try {
      const deficiencia = await (manager ?? this.entityManagerHelper)
        .createQueryBuilder(Deficiencia, 'd')
        .leftJoinAndSelect('d.graus', 'gd', (jqb) => {
          return allGrauEstado
            ? jqb
            : jqb.equal('gd.estado', EstadoDeficiencia.ATIVO);
        })
        .leftJoinAndSelect('gd.deficiencia', 'd_gd')
        .whereEqual('d.idDeficiencia', id)
        .withDeleted()
        .getOne();

      if (!deficiencia) {
        throw new NotFoundException(
          `Tipologia de deficiência com o ID [${id}] não localizada.`,
        );
      }

      return deficiencia;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Erro ao carregar os dados da deficiência.',
      );
    }
  }

  async listar(
    filtro: FiltroDeficienciaDto,
  ): Promise<PaginationResult<Deficiencia>> {
    try {
      const query = this.entityManagerHelper
        .createQueryBuilder(Deficiencia, 'd')
        .leftJoinAndSelect('d.graus', 'gd', (jqb) => {
          return jqb.equal('gd.estado', EstadoDeficiencia.ATIVO);
        })
        .leftJoinAndSelect('gd.deficiencia', 'd_gd')
        .whereLike('d.descricao', filtro.descricao)
        .whereEqual('d.estado', filtro.estado)
        .withDeleted()
        .orderBy('d.descricao', 'ASC');
      console.warn(query.getSqlCompiled());

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
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Erro ao processar listagem de deficiências.',
      );
    }
  }

  private obterQueryBaseContagemEstatistica(): QueryBuilderHelper<Deficiencia> {
    const papelLogado = this.cls.get<PapelUtilizador>('papel');
    const idOrganizacaoLogada = this.cls.get<string>('idOrganizacao');

    const query = this.entityManagerHelper
      .createQueryBuilder(Deficiencia, 'd')
      .withDeleted();

    if (papelLogado !== PapelUtilizador.ADMINISTRADOR) {
      query.whereEqual('d.idOrganizacao', idOrganizacaoLogada || '0');
    }

    return query;
  }

  async obterEstatisticas() {
    try {
      const total = await this.obterQueryBaseContagemEstatistica().getCount();

      const ativos = await this.obterQueryBaseContagemEstatistica()
        .whereEqual('d.estado', EstadoDeficiencia.ATIVO)
        .getCount();

      const inativos = await this.obterQueryBaseContagemEstatistica()
        .whereEqual('d.estado', EstadoDeficiencia.INATIVO)
        .getCount();

      const cidadaosVinculados = await this.entityManagerHelper
        .createQueryBuilder(CidadaoDeficiencia, 'cd')
        .groupBy('idCidadao')
        .getCount();

      return { total, ativos, inativos, cidadaosVinculados };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao processar as estatísticas do painel de condição especial.',
      );
    }
  }

  private async eliminarGrausInativosSemVinculos() {
    try {
      const sql = this.entityManagerHelper
        .createQueryBuilder(GrauDeficiencia, 'gd')
        .whereEqual('gd.estado', EstadoDeficiencia.INATIVO)
        .andGroup((qb) => {
          qb.whereLessThanOrEqual(
            '(SELECT COUNT(*) FROM tb_cidadao_deficiencia cd '.concat(
              'WHERE cd.idGrauDeficiencia = gd.idGrauDeficiencia)',
            ),
            0,
          );
        });
      const graus = await sql.getMany();
      this.entityManagerHelper.delete(
        GrauDeficiencia,
        graus.map((g) => g.idGrauDeficiencia),
      );
    } catch (error) {
      this.logger.error(error);
    }
  }
}
