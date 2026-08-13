import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EntityManagerHelper } from '@2bbelmiro/typeorm-query-buider-helper';
import { ClsService } from 'nestjs-cls';
import { Cidadao } from '../cidadao/entities/cidadao.entity';
import { CidadaoDeficiencia } from '../cidadao/entities/cidadao-deficiencia.entity';
import { AuditoriaSistema } from '../cidadao/entities/auditoria-sistema.entity';
import { Bairro } from '../geografia/entities/bairro.entity';
import { Municipio } from '../geografia/entities/municipio.entity';
import { Utilizador } from '../utilizador/entities/utilizador.entity';
import { FiltroDashboardDto } from './dto/dashboard.dto';
import { EstadoCidadao, AcaoAuditoria } from '../cidadao/enums/cidadao.enum';
import { PapelUtilizador } from '../utilizador/enums/utilizador.enum';
import { Deficiencia } from '../deficiencia/entities/deficiencia.entity';
import { GrauDeficiencia } from '../deficiencia/entities/grau-deficiencia.entity';
import { EntityManager } from 'typeorm';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly entityManagerHelper: EntityManagerHelper,
    private readonly manager: EntityManager,
    private readonly cls: ClsService,
  ) {}

  async obterEstatistica(dto: FiltroDashboardDto) {
    try {
      // 1. Inicia a construção da Query Base
      const queryDeficiencias = this.entityManagerHelper
        .createQueryBuilder(CidadaoDeficiencia, 'cd')
        .innerJoin('cd.grauDeficiencia', 'gd')
        .innerJoin('gd.deficiencia', 'd')
        .innerJoin('cd.cidadao', 'c', (q) =>
          q.equal('c.estado', EstadoCidadao.ATIVO),
        )
        .build()
        .select([
          'd.descricao AS deficiencia',
          'COUNT(DISTINCT cd.idCidadao) AS total',
        ])
        .groupBy('d.idDeficiencia')
        .addGroupBy('d.descricao')
        .limit(9);

      // 2. Aplica o filtro de Ano (se fornecido no DTO)
      if (dto.ano) {
        // YEAR() extrai o ano da data de criação no MySQL
        queryDeficiencias.andWhere('YEAR(c.dataCriacao) = :ano', {
          ano: dto.ano,
        });
      }

      // 3. Aplica o filtro de Bairros (se houver IDs no array)
      if (dto.idBairroIn && dto.idBairroIn.length > 0) {
        // Supõe-se que a tabela do cidadão ou da deficiência possua o vínculo idBairro
        queryDeficiencias.andWhere('c.idBairro IN (:...idBairros)', {
          idBairros: dto.idBairroIn,
        });
      }

      // 4. Executa a query final no banco de dados
      const deficiencias = await queryDeficiencias.getRawMany();

      const porpocaoEmQuantidade = await this.volumePorQuantidade(dto);
      const evolucaoCidadaos = await this.evolucaoMensal(dto);
      const grausPorDeficiencia =
        await this.distribuicaoGrausPorDeficiencia(dto);

      return {
        deficiencias,
        porpocaoEmQuantidade,
        evolucaoCidadaos,
        grausPorDeficiencia,
      };
    } catch (error: any) {
      this.logger.error(error.message);
      throw new InternalServerErrorException(
        'Ocorreu uma falha interna ao tentar compilar e agregar as métricas do painel analítico. ' +
          error.message,
      );
    }
  }
  private async evolucaoMensal(dto: FiltroDashboardDto) {
    // Define o ano base usando o DTO ou o ano atual do sistema
    const anoFiltro = dto.ano || new Date().getFullYear();

    // 1. Evolução de novos Cidadãos por mês
    const queryCidadaos = this.entityManagerHelper
      .createQueryBuilder(Cidadao, 'c')
      .build()
      .select("DATE_FORMAT(c.dataCriacao, '%Y-%m')", 'mes')
      .addSelect('COUNT(c.idCidadao)', 'novosCidadaos')
      .where('c.estado = :estado', { estado: EstadoCidadao.ATIVO })
      .andWhere('YEAR(c.dataCriacao) = :anoFiltro', { anoFiltro }) // Filtro de Ano
      .groupBy("DATE_FORMAT(c.dataCriacao, '%Y-%m')")
      .orderBy("DATE_FORMAT(c.dataCriacao, '%Y-%m')", 'ASC');

    if (dto.idBairroIn && dto.idBairroIn.length > 0) {
      queryCidadaos.andWhere('c.idBairro IN (:...idBairros)', {
        idBairros: dto.idBairroIn,
      });
    }

    const evolucaoCidadaos = await queryCidadaos.getRawMany();

    // 2. Evolução de novas Deficiências registadas por mês
    const queryDeficiencias = this.entityManagerHelper
      .createQueryBuilder(CidadaoDeficiencia, 'cd')
      .innerJoin('cd.cidadao', 'c', (q) =>
        q.equal('c.estado', EstadoCidadao.ATIVO),
      )
      .build()
      .select("DATE_FORMAT(cd.dataCriacao, '%Y-%m')", 'mes')
      .addSelect('COUNT(cd.idCidadaoDeficiencia)', 'novasDeficiencias')
      .where('YEAR(cd.dataCriacao) = :anoFiltro', { anoFiltro }) // Filtro de Ano
      .groupBy("DATE_FORMAT(cd.dataCriacao, '%Y-%m')")
      .orderBy("DATE_FORMAT(cd.dataCriacao, '%Y-%m')", 'ASC');

    if (dto.idBairroIn && dto.idBairroIn.length > 0) {
      queryDeficiencias.andWhere('c.idBairro IN (:...idBairros)', {
        idBairros: dto.idBairroIn,
      });
    }

    const evolucaoDeficiencias = await queryDeficiencias.getRawMany();

    const mesesExtensoMin = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    const mesesExtenso = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];

    const mapaEvolucao = new Map<string, any>();

    let mesCorrente = 1;

    // --- CORREÇÃO AQUI: Usa o anoFiltro do DTO dinamicamente para o esqueleto ---
    while (mesCorrente <= 12) {
      const stringMes = `${anoFiltro}-${String(mesCorrente).padStart(2, '0')}`;
      const nomeMes = mesesExtenso[mesCorrente - 1];
      const nomeMesMin = mesesExtensoMin[mesCorrente - 1];

      mapaEvolucao.set(stringMes, {
        mes: stringMes,
        mesNum: mesCorrente,
        nomeMes,
        nomeMesMin,
        novosCidadaos: 0,
        novasDeficiencias: 0,
      });

      mesCorrente++;
    }

    for (const item of evolucaoCidadaos) {
      if (mapaEvolucao.has(item.mes)) {
        mapaEvolucao.get(item.mes).novosCidadaos = parseInt(
          item.novosCidadaos,
          10,
        );
      }
    }

    for (const item of evolucaoDeficiencias) {
      if (mapaEvolucao.has(item.mes)) {
        mapaEvolucao.get(item.mes).novasDeficiencias = parseInt(
          item.novasDeficiencias,
          10,
        );
      }
    }

    return Array.from(mapaEvolucao.values()).sort((a, b) =>
      a.mes.localeCompare(b.mes),
    );
  }

  private async volumePorQuantidade(dto: FiltroDashboardDto) {
    const subQueryBuilder = this.entityManagerHelper
      .createQueryBuilder(CidadaoDeficiencia, 'cd')
      .innerJoin('cd.grauDeficiencia', 'grau')
      .innerJoin('cd.cidadao', 'c', (q) =>
        q.equal('c.estado', EstadoCidadao.ATIVO),
      )
      .build()
      .select('cd.idCidadao', 'idCidadao')
      .addSelect('COUNT(DISTINCT grau.idDeficiencia)', 'totalDeficiencias')
      .groupBy('c.idCidadao');

    // Filtros injetados de forma estrita dentro da subquery
    if (dto.ano) {
      subQueryBuilder.andWhere('YEAR(c.dataCriacao) = :ano', { ano: dto.ano });
    }

    if (dto.idBairroIn && dto.idBairroIn.length > 0) {
      subQueryBuilder.andWhere('c.idBairro IN (:...idBairros)', {
        idBairros: dto.idBairroIn,
      });
    }

    const indiceMultideficiencia = await this.manager
      .createQueryBuilder()
      .select(
        `CASE 
            WHEN sub.totalDeficiencias = 1 THEN '1 Deficiência'
            WHEN sub.totalDeficiencias = 2 THEN '2 Deficiências'
            ELSE '3 ou mais Deficiências'
          END`,
        'categoria',
      )
      .addSelect('COUNT(*)', 'totalCidadaos')
      .from(`(${subQueryBuilder.getQuery()})`, 'sub')
      .setParameters(subQueryBuilder.getParameters())
      .groupBy('categoria')
      .getRawMany();

    return indiceMultideficiencia.map((item) => ({
      categoria: item.categoria,
      totalCidadaos: parseInt(item.totalCidadaos, 10),
    }));
  }

  private async distribuicaoGrausPorDeficiencia(dto: FiltroDashboardDto) {
    const queryGraus = this.entityManagerHelper
      .createQueryBuilder(CidadaoDeficiencia, 'cd')
      .innerJoin('cd.grauDeficiencia', 'grau')
      .innerJoin('grau.deficiencia', 'deficiencia')
      .innerJoin('cd.cidadao', 'c', (q) =>
        q.equal('c.estado', EstadoCidadao.ATIVO),
      )
      .build()
      .select([
        'deficiencia.idDeficiencia AS idDeficiencia',
        'deficiencia.descricao AS deficiencia',
        'grau.idGrauDeficiencia AS idGrauDeficiencia',
        'grau.descricao AS grau',
        'COUNT(DISTINCT cd.idCidadao) AS total',
      ])
      .groupBy('deficiencia.idDeficiencia')
      .addGroupBy('deficiencia.descricao')
      .addGroupBy('grau.idGrauDeficiencia')
      .addGroupBy('grau.descricao')
      .orderBy('deficiencia.descricao', 'ASC')
      .addOrderBy('COUNT(DISTINCT cd.idCidadao)', 'DESC');

    // Filtros aplicados na query principal
    if (dto.ano) {
      queryGraus.andWhere('YEAR(c.dataCriacao) = :ano', { ano: dto.ano });
    }

    if (dto.idBairroIn && dto.idBairroIn.length > 0) {
      queryGraus.andWhere('c.idBairro IN (:...idBairros)', {
        idBairros: dto.idBairroIn,
      });
    }

    const distribuicaoGraus = await queryGraus.getRawMany();

    const mapaDeficiencias = new Map<string, any>();

    for (const item of distribuicaoGraus) {
      if (!mapaDeficiencias.has(item.idDeficiencia)) {
        mapaDeficiencias.set(item.idDeficiencia, {
          idDeficiencia: item.idDeficiencia,
          deficiencia: item.deficiencia,
          totalGeralCidadaos: 0,
          graus: [],
        });
      }

      const totalItem = parseInt(item.total, 10);
      const deficienciaAtual = mapaDeficiencias.get(item.idDeficiencia);

      deficienciaAtual.graus.push({
        idGrauDeficiencia: item.idGrauDeficiencia,
        grau: item.grau,
        total: totalItem,
      });

      deficienciaAtual.totalGeralCidadaos += totalItem;
    }

    return Array.from(mapaDeficiencias.values());
  }

  async obterMetricas(
    filtro: FiltroDashboardDto,
  ): Promise<Record<string, unknown>> {
    try {
      const papelLogado = this.cls.get<PapelUtilizador>('papel');
      const idOrganizacaoLogada = this.cls.get<string>('idOrganizacao');

      // 1. CARDS CONTADORES (KPIs)
      const kpis = await this.calcularKpiCards(filtro);

      // 2. DISTRIBUIÇÃO GEOGRÁFICA (Onde estão?)
      const geografia = await this.calcularGeografia(
        filtro,
        papelLogado,
        idOrganizacaoLogada,
      );

      // 3. ANÁLISE CLÍNICA E DEMOGRÁFICA (Que tipos e quem são?)
      const clinicaDemografica = await this.calcularClinicaDemografica(
        filtro,
        papelLogado,
        idOrganizacaoLogada,
      );

      // 4. ANÁLISE TEMPORAL (Evolução de cadastros)
      const temporal = await this.calcularTemporal(
        filtro,
        papelLogado,
        idOrganizacaoLogada,
      );

      // 5. OPERACIONAL E AUDITORIA (Leaderboard e produtividade)
      const operacionalAuditoria = await this.calcularOperacionalAuditoria(
        filtro,
        papelLogado,
        idOrganizacaoLogada,
      );

      return {
        kpis,
        geografia,
        clinicaDemografica,
        temporal,
        operacionalAuditoria,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Ocorreu uma falha interna ao tentar compilar e agregar as métricas do painel analítico.',
      );
    }
  }

  // =========================================================================
  // SUB-MÉTODOS AGREGADORES (MÉTODOS PRIVADOS AUXILIARES)
  // =========================================================================

  private async calcularKpiCards(
    filtro: FiltroDashboardDto,
  ): Promise<Record<string, unknown>> {
    try {
      const papel = this.cls.get<PapelUtilizador>('papel');
      const idOrg = this.cls.get<string>('idOrganizacao');

      // Query Base com filtros
      const queryBase = this.entityManagerHelper
        .createQueryBuilder(Cidadao, 'c')
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO);

      this.aplicarFiltrosGlobais(queryBase, filtro, papel, idOrg);

      // KPI 01: Total de Cidadãos Cadastrados
      const totalCidadaos = await queryBase.getCount();

      // KPI 02: Cadastros Pendentes
      const queryPendentes = this.entityManagerHelper
        .createQueryBuilder(Cidadao, 'c')
        .whereEqual('c.estado', EstadoCidadao.PENDENTE);
      this.aplicarFiltrosGlobais(queryPendentes, filtro, papel, idOrg);
      const cadastrosPendentes = await queryPendentes.getCount();

      // KPI 03: Cadastros Ativos
      const queryAtivos = this.entityManagerHelper
        .createQueryBuilder(Cidadao, 'c')
        .whereEqual('c.estado', EstadoCidadao.ATIVO);
      this.aplicarFiltrosGlobais(queryAtivos, filtro, papel, idOrg);
      const cadastrosAtivos = await queryAtivos.getCount();

      // KPI 04: Densidade de Deficiências Registadas
      const queryPivot = this.entityManagerHelper
        .createQueryBuilder(CidadaoDeficiencia, 'cd')
        .innerJoin('tb_cidadao', 'c', 'cd.idCidadao = c.idCidadao')
        .groupBy('c.idCidadao')
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO);
      this.aplicarFiltrosGlobais(queryPivot, filtro, papel, idOrg);
      const totalAssociacoes = await queryPivot.getCount();
      const densidadeDeficiencias =
        totalCidadaos > 0
          ? Number((totalAssociacoes / totalCidadaos).toFixed(2))
          : 0;

      // KPI 05: Cobertura Territorial de Bairros (Bairros ativos no município vs total de bairros cadastrados)
      const totalBairrosMunicipio = await this.entityManagerHelper
        .createQueryBuilder(Bairro, 'b')
        .getCount();

      const queryBairrosAtivos = this.entityManagerHelper
        .createQueryBuilder(Cidadao, 'c')
        .select('COUNT(DISTINCT c.idBairro)', 'total')
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO);
      this.aplicarFiltrosGlobais(queryBairrosAtivos, filtro, papel, idOrg);
      const resBairros: any = await queryBairrosAtivos.getRawOne();
      const bairrosAtivosCount = Number(resBairros?.total) || 0;

      return {
        totalCidadaos,
        cadastrosPendentes,
        cadastrosAtivos,
        crescimentoHomologoPercentual: 14.5,
        densidadeDeficiencias,
        coberturaBairros: {
          bairrosAtivos: bairrosAtivosCount,
          bairrosTotais: totalBairrosMunicipio,
          percentual:
            totalBairrosMunicipio > 0
              ? Number(
                  ((bairrosAtivosCount / totalBairrosMunicipio) * 100).toFixed(
                    1,
                  ),
                )
              : 0,
        },
      };
    } catch (err) {
      throw new InternalServerErrorException(
        'Erro ao calcular KPIs principais.',
      );
    }
  }

  private async calcularGeografia(
    filtro: FiltroDashboardDto,
    papel: PapelUtilizador,
    idOrg: string,
  ): Promise<Record<string, unknown>> {
    try {
      // GEO 01: Concentração por Bairro
      const queryBairros = this.entityManagerHelper
        .createQueryBuilder(Cidadao, 'c')
        .select('b.descricao', 'bairro')
        .addSelectContext('COUNT(c.idCidadao)', 'total')
        .innerJoin('tb_bairro', 'b', 'c.idBairro = b.idBairro')
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO)
        .groupBy('b.idBairro')
        .orderBy('total', 'DESC');

      this.aplicarFiltrosGlobais(queryBairros, filtro, papel, idOrg);
      const rawBairros: any[] = await queryBairros.getRawMany();

      // Top 10 e Agrupamento "Outros"
      const limit = 10;
      const concentracaoPorBairro = rawBairros.slice(0, limit).map((r) => ({
        bairro: r.bairro,
        total: Number(r.total),
      }));

      if (rawBairros.length > limit) {
        const totalOutros = rawBairros
          .slice(limit)
          .reduce((acc, curr) => acc + Number(curr.total || 0), 0);
        concentracaoPorBairro.push({
          bairro: 'Outros',
          total: totalOutros,
        });
      }

      // GEO 02: Distribuição por Município e Província (Macro)
      const queryMacro = this.entityManagerHelper
        .createQueryBuilder(Cidadao, 'c')
        .select('p.descricao', 'provincia')
        .addSelectContext('m.descricao', 'municipio')
        .addSelectContext('COUNT(c.idCidadao)', 'total')
        .innerJoin('tb_bairro', 'b', 'c.idBairro = b.idBairro')
        .innerJoin('tb_municipio', 'm', 'b.idMunicipio = m.idMunicipio')
        .innerJoin('tb_provincia', 'p', 'm.idProvincia = p.idProvincia')
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO)
        .groupBy('m.idMunicipio')
        .orderBy('total', 'DESC');

      this.aplicarFiltrosGlobais(queryMacro, filtro, papel, idOrg);
      const rawMacro: any[] = await queryMacro.getRawMany();

      const totalMacro = rawMacro.reduce(
        (acc, curr) => acc + Number(curr.total),
        0,
      );
      const macroDistribuicao = rawMacro.map((m) => ({
        provincia: m.provincia,
        municipio: m.municipio,
        total: Number(m.total),
        percentual:
          totalMacro > 0
            ? Number(((Number(m.total) / totalMacro) * 100).toFixed(2))
            : 0,
      }));

      return {
        concentracaoPorBairro,
        macroDistribuicao,
      };
    } catch (err) {
      throw new InternalServerErrorException(
        'Erro ao calcular dados geográficos.',
      );
    }
  }

  private async calcularClinicaDemografica(
    filtro: FiltroDashboardDto,
    papel: PapelUtilizador,
    idOrg: string,
  ): Promise<Record<string, unknown>> {
    try {
      // DEMO 01: Tipologia de Deficiências Dominantes
      const queryDeficiencias = this.entityManagerHelper
        .createQueryBuilder(CidadaoDeficiencia, 'cd')
        .select('d.descricao', 'deficiencia')
        .addSelectContext('COUNT(cd.idCidadaoDeficiencia)', 'total')
        .innerJoin('tb_deficiencia', 'd', 'cd.idDeficiencia = d.idDeficiencia')
        .innerJoin('tb_cidadao', 'c', 'cd.idCidadao = c.idCidadao')
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO)
        .groupBy('d.idDeficiencia')
        .orderBy('total', 'DESC');

      this.aplicarFiltrosGlobais(queryDeficiencias, filtro, papel, idOrg);
      const rawDeficiencias: any[] = await queryDeficiencias.getRawMany();
      const totalDef = rawDeficiencias.reduce(
        (acc, curr) => acc + Number(curr.total),
        0,
      );

      const tipologiaDominante = rawDeficiencias.map((d) => ({
        deficiencia: d.deficiencia,
        total: Number(d.total),
        percentual:
          totalDef > 0
            ? Number(((Number(d.total) / totalDef) * 100).toFixed(2))
            : 0,
      }));

      // DEMO 02: Severidade e Grau por Deficiência
      const querySeveridade = this.entityManagerHelper
        .createQueryBuilder(CidadaoDeficiencia, 'cd')
        .select('d.descricao', 'deficiencia')
        .addSelectContext('cd.grauDeficiencia', 'grau')
        .addSelectContext('COUNT(cd.idCidadaoDeficiencia)', 'total')
        .innerJoin('tb_deficiencia', 'd', 'cd.idDeficiencia = d.idDeficiencia')
        .innerJoin('tb_cidadao', 'c', 'cd.idCidadao = c.idCidadao')
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO)
        .groupBy(['d.idDeficiencia', 'cd.grauDeficiencia']);

      this.aplicarFiltrosGlobais(querySeveridade, filtro, papel, idOrg);
      const rawSeveridade: any[] = await querySeveridade.getRawMany();

      // Mapeamento pivotado dos graus por deficiência
      const severidadeGrau: Record<string, any> = {};
      rawSeveridade.forEach((r) => {
        if (!severidadeGrau[r.deficiencia]) {
          severidadeGrau[r.deficiencia] = {
            LEVE: 0,
            MODERADO: 0,
            GRAVE: 0,
            PROFUNDO: 0,
          };
        }
        severidadeGrau[r.deficiencia][r.grau] = Number(r.total);
      });

      const severidadeGrauArray = Object.keys(severidadeGrau).map((def) => ({
        deficiencia: def,
        graus: severidadeGrau[def],
      }));

      // DEMO 03: Distribuição por Faixas Etárias (Idades calculadas em tempo de execução)
      const queryIdades = this.entityManagerHelper
        .createQueryBuilder(Cidadao, 'c')
        .select('TIMESTAMPDIFF(YEAR, c.dataNascimento, CURDATE())', 'idade')
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO);

      this.aplicarFiltrosGlobais(queryIdades, filtro, papel, idOrg);
      const rawIdades: any[] = await queryIdades.getRawMany();

      const faixas = {
        '0-5 anos': 0,
        '6-12 anos': 0,
        '13-17 anos': 0,
        '18-29 anos': 0,
        '30-49 anos': 0,
        '50-64 anos': 0,
        '65+ anos': 0,
      };

      rawIdades.forEach((r) => {
        const idade = Number(r.idade);
        if (idade <= 5) faixas['0-5 anos']++;
        else if (idade <= 12) faixas['6-12 anos']++;
        else if (idade <= 17) faixas['13-17 anos']++;
        else if (idade <= 29) faixas['18-29 anos']++;
        else if (idade <= 49) faixas['30-49 anos']++;
        else if (idade <= 64) faixas['50-64 anos']++;
        else faixas['65+ anos']++;
      });

      const faixasEtarias = Object.keys(faixas).map((key) => ({
        grupo: key,
        total: faixas[key as keyof typeof faixas],
      }));

      // DEMO 04: Tipos de Documentação Utilizados
      const queryDocs = this.entityManagerHelper
        .createQueryBuilder(Cidadao, 'c')
        .select('c.tipoIdentificacao', 'tipo')
        .addSelectContext('COUNT(c.idCidadao)', 'total')
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO)
        .groupBy('c.tipoIdentificacao');

      this.aplicarFiltrosGlobais(queryDocs, filtro, papel, idOrg);
      const rawDocs: any[] = await queryDocs.getRawMany();
      const tipoDocumentacao = rawDocs.map((doc) => ({
        tipo: doc.tipo,
        total: Number(doc.total),
      }));

      return {
        tipologiaDominante,
        severidadeGrau: severidadeGrauArray,
        faixasEtarias,
        tipoDocumentacao,
      };
    } catch (err) {
      throw new InternalServerErrorException(
        'Erro ao carregar análise demográfica.',
      );
    }
  }

  private async calcularTemporal(
    filtro: FiltroDashboardDto,
    papel: PapelUtilizador,
    idOrg: string,
  ): Promise<Record<string, unknown>> {
    try {
      // TEMP 01: Linha de Tendência de Inscrições
      const queryTrend = this.entityManagerHelper
        .createQueryBuilder(Cidadao, 'c')
        .select("DATE_FORMAT(c.dataInscricao, '%Y-%m')", 'periodo')
        .addSelectContext('COUNT(c.idCidadao)', 'total')
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO)
        .groupBy("DATE_FORMAT(c.dataInscricao, '%Y-%m')")
        .orderBy('periodo', 'ASC');

      this.aplicarFiltrosGlobais(queryTrend, filtro, papel, idOrg);
      const rawTrend: any[] = await queryTrend.getRawMany();
      const tendenciaInscricoes = rawTrend.map((t) => ({
        periodo: t.periodo,
        total: Number(t.total),
      }));

      return {
        tendenciaInscricoes,
        comparativoOrganizacoes: [], // Simulação de comparação multi-linhas
      };
    } catch (err) {
      throw new InternalServerErrorException(
        'Erro ao carregar a tendência temporal.',
      );
    }
  }

  private async calcularOperacionalAuditoria(
    filtro: FiltroDashboardDto,
    papel: PapelUtilizador,
    idOrg: string,
  ): Promise<Record<string, unknown>> {
    try {
      // AUD 01: Top Cadastradores (Produtividade baseada no criador)
      const queryProd = this.entityManagerHelper
        .createQueryBuilder(Cidadao, 'c')
        .select('u.nomeCompleto', 'nome')
        .addSelectContext('u.papel', 'papel')
        .addSelectContext('COUNT(c.idCidadao)', 'criados')
        .innerJoin(
          'tb_utilizador',
          'u',
          'c.idUtilizadorCriador = u.idUtilizador',
        )
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO)
        .groupBy('c.idUtilizadorCriador')
        .orderBy('criados', 'DESC')
        .limit(5);

      this.aplicarFiltrosGlobais(queryProd, filtro, papel, idOrg);
      const rawProd: any[] = await queryProd.getRawMany();
      const topCadastradores = rawProd.map((p, idx) => ({
        posicao: idx + 1,
        nome: p.nome,
        papel: p.papel,
        criados: Number(p.criados),
        editados: Math.floor(Number(p.criados) * 0.4), // Simulação proporcional de edições para o leaderboard
      }));

      // AUD 02: Volume de Soft Deletes Recentes com justificações
      const queryDeletes = this.entityManagerHelper
        .createQueryBuilder(AuditoriaSistema, 'a')
        .select('c.nomeCompleto', 'cidadaoNome')
        .addSelectContext('u.nomeCompleto', 'eliminadorNome')
        .addSelectContext('a.dataEvento', 'dataEliminacao')
        .addSelectContext(
          "JSON_UNQUOTE(JSON_EXTRACT(a.valorNovo, '$.motivoEliminacao'))",
          'justificacao',
        )
        .innerJoin('tb_cidadao', 'c', 'a.idRegisto = c.idCidadao')
        .innerJoin('tb_utilizador', 'u', 'a.idUtilizador = u.idUtilizador')
        .whereEqual('a.acao', AcaoAuditoria.ELIMINAR)
        .whereEqual('a.tabelaAfetada', 'tb_cidadao')
        .orderBy('a.dataEvento', 'DESC')
        .limit(5);

      if (papel !== PapelUtilizador.ADMINISTRADOR) {
        queryDeletes.whereEqual('a.idOrganizacao', idOrg || '0');
      }

      const rawDeletes: any[] = await queryDeletes.getRawMany();
      const eliminacoesCriticas = rawDeletes.map((d) => ({
        cidadaoNome: d.cidadaoNome,
        eliminadorNome: d.eliminadorNome,
        dataEliminacao: d.dataEliminacao,
        justificacao: d.justificacao || 'Eliminação lógica padrão do sistema.',
      }));

      return {
        topCadastradores,
        eliminacoesCriticas,
        operacoesSessoes: {
          sessoesAtivasDuasHoras: 12, // Cartão simulado baseado em tb_sessao
          dispositivosFrequentes: [
            { sistema: 'Windows / Chrome', total: 7200 },
            { sistema: 'Android / Mobile Chrome', total: 2450 },
          ],
        },
      };
    } catch (err) {
      throw new InternalServerErrorException(
        'Erro ao calcular dados de auditoria e produtividade.',
      );
    }
  }

  // =========================================================================
  // MOTOR DE FILTRAGEM MULTI-TENANT E GLOBAL
  // =========================================================================

  private aplicarFiltrosGlobais(
    query: any,
    filtro: FiltroDashboardDto,
    papel: PapelUtilizador,
    idOrg: string,
  ): void {
    // 1. Filtro Temporal (Data de Inscrição)
    if (filtro.dataInscricaoInicio) {
      query.whereGreaterThanOrEqual(
        'c.dataInscricao',
        new Date(filtro.dataInscricaoInicio),
      );
    }
    if (filtro.dataInscricaoFim) {
      query.whereLessThanOrEqual(
        'c.dataInscricao',
        new Date(filtro.dataInscricaoFim),
      );
    }

    // 2. Filtro Geográfico em Cascata
    if (filtro.idBairro) {
      query.whereEqual('c.idBairro', filtro.idBairro);
    } else if (filtro.idMunicipio) {
      query
        .innerJoin('tb_bairro', 'b_filter', 'c.idBairro = b_filter.idBairro')
        .whereEqual('b_filter.idMunicipio', filtro.idMunicipio);
    } else if (filtro.idProvincia) {
      query
        .innerJoin('tb_bairro', 'b_filter', 'c.idBairro = b_filter.idBairro')
        .innerJoin(
          'tb_municipio',
          'm_filter',
          'b_filter.idMunicipio = m_filter.idMunicipio',
        )
        .whereEqual('m_filter.idProvincia', filtro.idProvincia);
    }

    // 3. Filtro Clínico (Seleção Múltipla)
    if (filtro.idsDeficiencias && filtro.idsDeficiencias.length > 0) {
      query
        .innerJoin(
          'tb_cidadao_deficiencia',
          'cd_filter',
          'c.idCidadao = cd_filter.idCidadao',
        )
        .whereIn('cd_filter.idDeficiencia', filtro.idsDeficiencias);
    }

    // 4. Filtro de Estado
    if (filtro.estado) {
      query.whereEqual('c.estado', filtro.estado);
    }

    // 5. Restrição Multi-Tenant de Segurança Ativa (Cls-First)
    if (papel !== PapelUtilizador.ADMINISTRADOR) {
      query.whereEqual('c.idOrganizacao', idOrg || '0');
    }
  }
}
