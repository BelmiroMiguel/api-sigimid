import { EntityManagerHelper } from '@2bbelmiro/typeorm-query-buider-helper';
import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'; // Ou Mongoose / Prisma dependendo do seu ORM
import { EntityManager, Repository } from 'typeorm';
import { Organizacao } from '../../modules/organizacao/entities/organizacao.entity';
import { EstadoOrganizacao } from '../../modules/organizacao/enums/organizacao.enum';
import { Utilizador } from '../../modules/utilizador/entities/utilizador.entity';
import * as bcrypt from 'bcrypt';
import { PapelUtilizador } from '../../modules/utilizador/enums/utilizador.enum';
import { Provincia } from '../../modules/geografia/entities/provincia.entity';
import { Municipio } from '../../modules/geografia/entities/municipio.entity';
import { Bairro } from '../../modules/geografia/entities/bairro.entity';
import { Deficiencia } from '../../modules/deficiencia/entities/deficiencia.entity';
import { GrauDeficiencia } from '../../modules/deficiencia/entities/grau-deficiencia.entity';

@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(private readonly entityManagerHelper: EntityManagerHelper) {}

  async onApplicationBootstrap() {
    this.logger.log('A verificar sementes de dados (Seed)...');

    // Verifica se já existe alguma empresa cadastrada
    const empresaExiste = await this.entityManagerHelper.findOne(Organizacao, {
      where: { estado: EstadoOrganizacao.ATIVO },
    });
    if (empresaExiste) {
      this.logger.warn('Dados já existem na base de dados. Seed cancelado.');
      return;
    }

    try {
      // 2. Cria a Empresa pioneira
      await this.entityManagerHelper.transaction(async (manager) => {
        const empresaSalva = await this.criarEmpresa(manager);
        const adminFuncionario = await this.criarAdminFuncionario(
          manager,
          empresaSalva,
        );
        await this.criarProvincias(manager, adminFuncionario);

        await this.criarDeficiencias(manager, adminFuncionario);

        this.logger.log('Semente dos dados inicializadas');
      });
    } catch (error) {
      this.logger.error('Erro ao executar o seed automático:', error);
    }
  }

  private async criarEmpresa(manager: EntityManager) {
    const novaEmpresa = manager.create(Organizacao, {
      descricao:
        'SIGIMID - Sistema de Gestão Municipal de Inclusão do Cidadão com Deficiência',
      identificacao: '123456789',
    });
    return await manager.save(novaEmpresa);
  }

  private async criarAdminFuncionario(
    manager: EntityManager,
    empresaSalva: Organizacao,
  ) {
    const senha = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const novoFuncionario = manager.create(Utilizador, {
      nomeCompleto: 'Administrador',
      email: 'admin@sigimid.ao',
      papel: PapelUtilizador.ADMINISTRADOR,
      idOrganizacao: empresaSalva.idOrganizacao,
      senhaHash: senhaHash,
      empresa: empresaSalva,
    });
    return await manager.save(novoFuncionario);
  }

  private async criarProvincias(
    manager: EntityManager,
    utilizador: Utilizador,
  ) {
    const novasProvincias = manager.create(Provincia, [
      {
        descricao: 'Luanda',
        municipios: [
          {
            descricao: 'Viana',
            bairros: [
              { descricao: 'Bita Sapú' },
              { descricao: 'Sapú 2' },
              { descricao: 'Sapú' },
            ],
          },
          { descricao: 'Cazenga' },
          { descricao: 'Camama' },
          { descricao: 'Talatona' },
          {
            descricao: 'Kilamba',
            bairros: [{ descricao: 'Vila Flor' }, { descricao: 'Cinco Fio' }],
          },
          { descricao: 'Belas' },
        ],
      },
      { descricao: 'Huambo' },
      { descricao: 'Bié' },
      { descricao: 'Uíge' },
      { descricao: 'Malange' },
      { descricao: 'Cabinda' },
      {
        descricao: 'Icolo e bengo',
        municipios: [{ descricao: 'Bom Jesus' }, { descricao: 'Catete' }],
      },
    ]);

    const provincias = await manager.save(
      Provincia,
      novasProvincias.map((p) => {
        return {
          ...p,
          idUltimaModificacao: utilizador.idUtilizador,
        };
      }),
    );

    const municipios = await this.criarMunicipiosEBairros(
      manager,
      provincias,
      utilizador,
    );
    return provincias;
  }

  private async criarMunicipiosEBairros(
    manager: EntityManager,
    provincias: Provincia[],
    utilizador: Utilizador,
  ) {
    for (let index = 0; index < provincias.length; index++) {
      const provincia = provincias[index];
      const municipios = provincia.municipios;
      if (municipios) {
        const novosMunicipios = manager.create(
          Municipio,
          municipios.map((m) => {
            return {
              idUltimaModificacao: utilizador.idUtilizador,
              idProvincia: provincia.idProvincia,
              descricao: m.descricao,
              bairros: m.bairros,
            };
          }),
        );

        const municipiosCriados = await manager.save(
          Municipio,
          novosMunicipios,
        );
        for (let index = 0; index < municipiosCriados.length; index++) {
          const municipio = municipiosCriados[index];
          const bairros = municipio.bairros;
          if (bairros) {
            const novosBairros = manager.create(
              Bairro,
              bairros.map((b) => {
                return {
                  idUltimaModificacao: utilizador.idUtilizador,
                  idMunicipio: municipio.idMunicipio,
                  descricao: b.descricao,
                };
              }),
            );

            const bairrosCriados = await manager.save(Bairro, novosBairros);
          }
        }
      }
    }
  }

  private async criarDeficiencias(
    manager: EntityManager,
    utilizador: Utilizador,
  ) {
    const novasDeficiencias = manager.create(Deficiencia, [
      {
        descricao: 'Auditiva',
        graus: [
          { descricao: 'Média' },
          { descricao: 'Elevada' },
          { descricao: 'Surdés' },
        ],
      },
      {
        descricao: 'Visual',
        graus: [
          { descricao: 'Média' },
          { descricao: 'Desfoque Elevado' },
          { descricao: 'Cegueira' },
        ],
      },
    ]);

    const deficienciasCriadas = await manager.save(
      Deficiencia,
      novasDeficiencias.map((d) => {
        return {
          ...d,
          idUltimaModificacao: utilizador.idUtilizador,
        };
      }),
    );

    for (let index = 0; index < deficienciasCriadas.length; index++) {
      const deficiencia = deficienciasCriadas[index];
      const grausDeficiencia = deficiencia.graus;
      if (grausDeficiencia) {
        const novosGraus = manager.create(
          GrauDeficiencia,
          grausDeficiencia.map((gd) => {
            return {
              ...gd,
              idDeficiencia: deficiencia.idDeficiencia,
              idUltimaModificacao: utilizador.idUtilizador,
            };
          }),
        );
        await manager.save(GrauDeficiencia, novosGraus);
      }
    }
  }
}
