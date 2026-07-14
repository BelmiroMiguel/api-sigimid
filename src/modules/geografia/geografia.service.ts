import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EntityManagerHelper } from '@2bbelmiro/typeorm-query-buider-helper';
import { ClsService } from 'nestjs-cls';
import { Provincia } from './entities/provincia.entity';
import { Municipio } from './entities/municipio.entity';
import { Bairro } from './entities/bairro.entity';
import {
  CriarProvinciaDto,
  EditarProvinciaDto,
  FiltroProvinciaDto,
  CriarMunicipioDto,
  EditarMunicipioDto,
  FiltroMunicipioDto,
  CriarBairroDto,
  EditarBairroDto,
  FiltroBairroDto,
} from './dto/geografia.dto';
import { EstadoGeografia } from './enums/geografia.enum';

@Injectable()
export class GeografiaService {
  constructor(
    private readonly entityManagerHelper: EntityManagerHelper,
    private readonly cls: ClsService,
  ) {}

  // ==========================================
  // OPERAÇÕES DE PROVÍNCIA
  // ==========================================

  async criarProvincia(dto: CriarProvinciaDto): Promise<Provincia> {
    try {
      const provinciaExiste = await this.entityManagerHelper
        .createQueryBuilder(Provincia, 'p')
        .whereEqual('p.descricao', dto.descricao)
        .whereNull('p.dataEliminacao')
        .getOne();

      if (provinciaExiste) {
        throw new ConflictException(
          `A província [${dto.descricao}] já se encontra registada.`,
        );
      }

      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        const novaProvincia = manager.create(Provincia, {
          descricao: dto.descricao,
          idUltimaModificacao: idUtilizadorLogado,
        });
        return await manager.save(novaProvincia);
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException(
        'Falha interna ao tentar registar a província.',
      );
    }
  }

  async editarProvincia(
    id: string,
    dto: EditarProvinciaDto,
  ): Promise<Provincia> {
    try {
      const provincia = await this.buscarProvinciaPorId(id);

      if (dto.descricao && dto.descricao !== provincia.descricao) {
        const descricaoExiste = await this.entityManagerHelper
          .createQueryBuilder(Provincia, 'p')
          .whereEqual('p.descricao', dto.descricao)
          .whereNotEqual('p.idProvincia', id)
          .whereNull('p.dataEliminacao')
          .getOne();

        if (descricaoExiste) {
          throw new ConflictException(
            `A província [${dto.descricao}] já existe.`,
          );
        }
      }

      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        manager.merge(Provincia, provincia, {
          ...dto,
          idUltimaModificacao: idUtilizadorLogado,
        });
        return await manager.save(provincia);
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException(
        'Erro ao atualizar os dados da província.',
      );
    }
  }

  async buscarProvinciaPorId(id: string): Promise<Provincia> {
    try {
      const provincia = await this.entityManagerHelper
        .createQueryBuilder(Provincia, 'p')
        .whereEqual('p.idProvincia', id)
        .whereNull('p.dataEliminacao')
        .getOne();

      if (!provincia) {
        throw new NotFoundException(
          `Província com o ID [${id}] não localizada.`,
        );
      }

      return provincia;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Erro ao carregar os dados da província.',
      );
    }
  }

  async listarProvincias(filtro: FiltroProvinciaDto) {
    try {
      const query = this.entityManagerHelper
        .createQueryBuilder(Provincia, 'p')
        .leftJoinAndSelect('p.municipios', 'm')
        .leftJoinAndSelect('m.bairros', 'b')
        .whereNull('p.dataEliminacao')
        .whereLike('p.descricao', filtro.descricao)
        .whereEqual('p.estado', filtro.estado)
        .orderBy('p.descricao', 'ASC');

      return await query.paginate({
        page: Number(filtro.pagina) || 1,
        limit: Number(filtro.itensPorPagina) || 10,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro de paginação ao listar províncias.',
      );
    }
  }

  // ==========================================
  // OPERAÇÕES DE MUNICÍPIO
  // ==========================================

  async criarMunicipio(dto: CriarMunicipioDto): Promise<Municipio> {
    try {
      await this.buscarProvinciaPorId(dto.idProvincia);

      const municipioExiste = await this.entityManagerHelper
        .createQueryBuilder(Municipio, 'm')
        .whereEqual('m.descricao', dto.descricao)
        .whereEqual('m.idProvincia', dto.idProvincia)
        .whereNull('m.dataEliminacao')
        .getOne();

      if (municipioExiste) {
        throw new ConflictException(
          `O município [${dto.descricao}] já existe nesta província.`,
        );
      }

      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        const novoMunicipio = manager.create(Municipio, {
          idProvincia: dto.idProvincia,
          descricao: dto.descricao,
          idUltimaModificacao: idUtilizadorLogado,
        });
        return await manager.save(novoMunicipio);
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException(
        'Falha interna ao tentar registar o município.',
      );
    }
  }

  async editarMunicipio(
    id: string,
    dto: EditarMunicipioDto,
  ): Promise<Municipio> {
    try {
      const municipio = await this.buscarMunicipioPorId(id);

      if (dto.idProvincia) {
        await this.buscarProvinciaPorId(dto.idProvincia);
      }

      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        manager.merge(Municipio, municipio, {
          ...dto,
          idUltimaModificacao: idUtilizadorLogado,
        });
        return await manager.save(municipio);
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Erro ao atualizar os dados do município.',
      );
    }
  }

  async buscarMunicipioPorId(id: string): Promise<Municipio> {
    try {
      const municipio = await this.entityManagerHelper
        .createQueryBuilder(Municipio, 'm')
        .leftJoinAndSelect('m.provincia', 'p')
        .whereEqual('m.idMunicipio', id)
        .whereNull('m.dataEliminacao')
        .getOne();

      if (!municipio) {
        throw new NotFoundException(
          `Município com o ID [${id}] não localizado.`,
        );
      }

      return municipio;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Erro ao carregar dados do município.',
      );
    }
  }

  async listarMunicipios(filtro: FiltroMunicipioDto) {
    try {
      const query = this.entityManagerHelper
        .createQueryBuilder(Municipio, 'm')
        .leftJoinAndSelect('m.provincia', 'p')
        .whereNull('m.dataEliminacao')
        .whereEqual('m.idProvincia', filtro.idProvincia)
        .whereLike('m.descricao', filtro.descricao)
        .whereEqual('m.estado', filtro.estado)
        .orderBy('m.descricao', 'ASC');

      return await query.paginate({
        page: Number(filtro.pagina) || 1,
        limit: Number(filtro.itensPorPagina) || 10,
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro ao listar municípios.');
    }
  }

  // ==========================================
  // OPERAÇÕES DE BAIRRO
  // ==========================================

  async criarBairro(dto: CriarBairroDto): Promise<Bairro> {
    try {
      await this.buscarMunicipioPorId(dto.idMunicipio);

      const bairroExiste = await this.entityManagerHelper
        .createQueryBuilder(Bairro, 'b')
        .whereEqual('b.descricao', dto.descricao)
        .whereEqual('b.idMunicipio', dto.idMunicipio)
        .whereNull('b.dataEliminacao')
        .getOne();

      if (bairroExiste) {
        throw new ConflictException(
          `O bairro [${dto.descricao}] já se encontra mapeado para este município.`,
        );
      }

      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        const novoBairro = manager.create(Bairro, {
          idMunicipio: dto.idMunicipio,
          descricao: dto.descricao,
          idUltimaModificacao: idUtilizadorLogado,
        });
        return await manager.save(novoBairro);
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException('Falha ao registar o bairro.');
    }
  }

  async editarBairro(id: string, dto: EditarBairroDto): Promise<Bairro> {
    try {
      const bairro = await this.buscarBairroPorId(id);

      if (dto.idMunicipio) {
        await this.buscarMunicipioPorId(dto.idMunicipio);
      }

      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');

      return await this.entityManagerHelper.transaction(async (manager) => {
        manager.merge(Bairro, bairro, {
          ...dto,
          idUltimaModificacao: idUtilizadorLogado,
        });
        return await manager.save(bairro);
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao editar dados do bairro.');
    }
  }

  async buscarBairroPorId(id: string): Promise<Bairro> {
    try {
      const bairro = await this.entityManagerHelper
        .createQueryBuilder(Bairro, 'b')
        .leftJoinAndSelect('b.municipio', 'm')
        .whereEqual('b.idBairro', id)
        .whereNull('b.dataEliminacao')
        .getOne();

      if (!bairro) {
        throw new NotFoundException(
          `O bairro com o ID [${id}] não foi localizado.`,
        );
      }

      return bairro;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Erro ao carregar dados do bairro.',
      );
    }
  }

  async listarBairros(filtro: FiltroBairroDto) {
    try {
      const query = this.entityManagerHelper
        .createQueryBuilder(Bairro, 'b')
        .leftJoinAndSelect('b.municipio', 'm')
        .leftJoinAndSelect('m.provincia', 'p')
        .whereNull('b.dataEliminacao')
        .whereEqual('b.idMunicipio', filtro.idMunicipio)
        .whereLike('b.descricao', filtro.descricao)
        .whereEqual('b.estado', filtro.estado)
        .orderBy('b.descricao', 'ASC');

      return await query.paginate({
        page: Number(filtro.pagina) || 1,
        limit: Number(filtro.itensPorPagina) || 10,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao processar listagem de bairros.',
      );
    }
  }
}
