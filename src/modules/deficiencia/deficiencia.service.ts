import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EntityManagerHelper } from '@2bbelmiro/typeorm-query-buider-helper';
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

@Injectable()
export class DeficienciaService {
  constructor(
    private readonly entityManagerHelper: EntityManagerHelper,
    private readonly cls: ClsService,
  ) {}

  async criar(dto: CriarDeficienciaDto): Promise<Deficiencia> {
    try {
      const deficienciaExiste = await this.entityManagerHelper
        .createQueryBuilder(Deficiencia, 'd')
        .whereEqual('d.descricao', dto.descricao)
        .whereNull('d.dataEliminacao')
        .getOne();

      if (deficienciaExiste) {
        throw new ConflictException(
          `A tipologia de deficiência [${dto.descricao}] já se encontra cadastrada.`,
        );
      }
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        const novaDeficiencia = manager.create(Deficiencia, {
          descricao: dto.descricao,
          idUltimaModificacao: idUtilizadorLogado,
        });

        const deficienciaSave = await manager.save(novaDeficiencia);

        for (let index = 0; index < dto.graus.length; index++) {
          const grau = dto.graus[index];
          const novoGrau = manager.create(GrauDeficiencia, {
            descricao: grau,
            idDeficiencia: deficienciaSave.idDeficiencia,
          });
          await manager.save(GrauDeficiencia, novoGrau);
        }

        return await manager.save(novaDeficiencia);
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException(
        'Erro interno ao tentar registar a tipologia de deficiência.',
      );
    }
  }

  async editar(id: string, dto: EditarDeficienciaDto): Promise<Deficiencia> {
    try {
      const deficiencia = await this.buscarPorId(id);

      if (dto.descricao && dto.descricao !== deficiencia.descricao) {
        const descricaoExiste = await this.entityManagerHelper
          .createQueryBuilder(Deficiencia, 'd')
          .leftJoinAndSelect('d.graus', 'gd')
          .whereEqual('d.descricao', dto.descricao)
          .whereNotEqual('d.idDeficiencia', id)
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
        manager.merge(Deficiencia, deficiencia, {
          ...dto,
          idUltimaModificacao: idUtilizadorLogado,
        });

        return await manager.save(deficiencia);
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException(
        'Erro interno ao tentar atualizar a tipologia de deficiência.',
      );
    }
  }

  async eliminar(id: string): Promise<void> {
    try {
      const deficiencia = await this.buscarPorId(id);
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

  async buscarPorId(id: string): Promise<Deficiencia> {
    try {
      const deficiencia = await this.entityManagerHelper
        .createQueryBuilder(Deficiencia, 'd')
        .leftJoinAndSelect('d.graus', 'gd')
        .leftJoinAndSelect('gd.deficiencia', 'd_gd')
        .whereEqual('d.idDeficiencia', id)
        .whereNull('d.dataEliminacao')
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
        .leftJoinAndSelect('d.graus', 'gd')
        .leftJoinAndSelect('gd.deficiencia', 'd_gd')
        .whereNull('d.dataEliminacao')
        .whereLike('d.descricao', filtro.descricao)
        .whereEqual('d.estado', filtro.estado)
        .orderBy('d.descricao', 'ASC');

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
        'Erro ao processar listagem de deficiências.',
      );
    }
  }
}
