import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  HttpException,
} from '@nestjs/common';
import {
  EntityManagerHelper,
  QueryBuilderHelper,
} from '@2bbelmiro/typeorm-query-buider-helper';
import { ClsService } from 'nestjs-cls';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { Cidadao } from './entities/cidadao.entity';
import { CidadaoDeficiencia } from './entities/cidadao-deficiencia.entity';
import { AuditoriaSistema } from './entities/auditoria-sistema.entity';
import { Deficiencia } from '../deficiencia/entities/deficiencia.entity';
import { Bairro } from '../geografia/entities/bairro.entity';
import {
  CriarCidadaoDto,
  EditarCidadaoDto,
  FiltroCidadaoDto,
  ExportarCidadaoDto,
} from './dto/cidadao.dto';
import { EstadoCidadao, AcaoAuditoria } from './enums/cidadao.enum';
import { PapelUtilizador } from '../utilizador/enums/utilizador.enum';
import path from 'path';
import { UploadService } from '../../core/upload/upload.service';
import { GrauDeficiencia } from '../deficiencia/entities/grau-deficiencia.entity';
import { EntityManager } from 'typeorm';

@Injectable()
export class CidadaoService {
  private readonly logger = new Logger(CidadaoService.name);

  constructor(
    private readonly entityManagerHelper: EntityManagerHelper,
    private readonly cls: ClsService,
    private readonly uploadService: UploadService,
  ) {}

  async criar(dto: CriarCidadaoDto): Promise<Cidadao> {
    try {
      // 1. Deduplicação Global (Angola)
      const cadastroExiste = await this.entityManagerHelper
        .createQueryBuilder(Cidadao, 'c')
        .whereEqual('c.identificacao', dto.identificacao)
        .whereEqual('c.tipoIdentificacao', dto.tipoIdentificacao)
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO)
        .getOne();

      if (cadastroExiste) {
        throw new ConflictException(
          `Já existe um cidadão registado em Angola com este documento [${dto.tipoIdentificacao}: ${dto.identificacao}].`,
        );
      }

      // 2. Verificar Bairro
      const bairro = await this.entityManagerHelper
        .createQueryBuilder(Bairro, 'b')
        .whereEqual('b.idBairro', dto.idBairro)
        .getOne();
      if (!bairro) {
        throw new NotFoundException(
          'O bairro de residência indicado não existe.',
        );
      }

      const idOrganizacaoLogada = this.cls.get<string>('idOrganizacao');
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');
      const ipRequest = this.cls.get<string>('ip');

      return await this.entityManagerHelper.transaction(async (manager) => {
        // Inserir Cidadao
        const novoCidadao = manager.create(Cidadao, {
          idOrganizacao: idOrganizacaoLogada,
          nomeCompleto: dto.nomeCompleto,
          identificacao: dto.identificacao,
          tipoIdentificacao: dto.tipoIdentificacao,
          dataNascimento: new Date(dto.dataNascimento),
          telefone: dto.telefone || null,
          idBairro: dto.idBairro,
          descricaoEndereco: dto.descricaoEndereco,
          dataInscricao: new Date(dto.dataInscricao),
          observacoes: dto.observacoes || null,
          idUtilizadorCriador: idUtilizadorLogado,
          idUltimaModificacao: idUtilizadorLogado,
          fotoPerfil: dto.fotoPerfil,
          fotosCorpoCompleto: dto.fotosCorpoCompleto,
        });

        const cidadaoSalvo = await manager.save(novoCidadao);

        // Inserir Deficiências Associativas
        for (const idGrauDeficiencia of dto.grausDeficiencias) {
          const grauDeficiencia = await manager.findOneBy(GrauDeficiencia, {
            idGrauDeficiencia,
          });
          if (!grauDeficiencia) {
            throw new NotFoundException(
              `A tipologia de deficiência não existe no catálogo.`,
            );
          }

          const existeDeficiencia = await manager.findOneBy(
            CidadaoDeficiencia,
            {
              idCidadao: cidadaoSalvo.idCidadao,
              idGrauDeficiencia: idGrauDeficiencia,
            },
          );
          if (existeDeficiencia) {
            throw new ConflictException(
              `Tipologia de deficiência iguais para o mesmo cidadão.`,
            );
          }

          const cd = manager.create(CidadaoDeficiencia, {
            idOrganizacao: idOrganizacaoLogada,
            idCidadao: cidadaoSalvo.idCidadao,
            idGrauDeficiencia: idGrauDeficiencia,
          });
          await manager.save(cd);
        }

        // Criar Log de Auditoria
        const log = manager.create(AuditoriaSistema, {
          idOrganizacao: idOrganizacaoLogada,
          tabelaAfetada: 'tb_cidadao',
          idRegisto: cidadaoSalvo.idCidadao,
          acao: AcaoAuditoria.CRIAR,
          valorAntigo: null,
          valorNovo: JSON.parse(JSON.stringify(cidadaoSalvo)),
          idUtilizador: idUtilizadorLogado,
          ip: ipRequest,
        });
        await manager.save(log);

        return await this.buscarPorId(cidadaoSalvo.idCidadao, manager);
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException(
        'Falha ao registar a ficha do cidadão.',
      );
    }
  }

  async editar(id: string, dto: EditarCidadaoDto): Promise<Cidadao> {
    try {
      const cidadao = await this.buscarPorId(id);
      const valorAntes = JSON.parse(JSON.stringify(cidadao));

      const fotoPerfilAntiga = cidadao.fotoPerfilBase;
      const fotosCorpoAntigas = cidadao.fotosCorpoCompletoBase || [];

      if (dto.identificacao && dto.identificacao !== cidadao.identificacao) {
        const cadastroExiste = await this.entityManagerHelper
          .createQueryBuilder(Cidadao, 'c')
          .whereEqual('c.identificacao', dto.identificacao)
          .whereEqual(
            'c.tipoIdentificacao',
            dto.tipoIdentificacao || cidadao.tipoIdentificacao,
          )
          .whereNotEqual('c.idCidadao', id)
          .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO)
          .getOne();

        if (cadastroExiste) {
          throw new ConflictException(
            'Este número de documento de identificação já existe.',
          );
        }
      }

      const idOrganizacaoLogada = this.cls.get<string>('idOrganizacao');
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');
      const ipRequest = this.cls.get<string>('ip');

      const caminhosFicheirosParaRemover: string[] = [];

      // Execução da transação no banco de dados
      const cidadaoSalvo = await this.entityManagerHelper.transaction(
        async (manager) => {
          let fotoPerfilAtual = cidadao.fotoPerfilBase;
          if (dto.fotoPerfil) {
            fotoPerfilAtual = dto.fotoPerfil;
            if (fotoPerfilAntiga && fotoPerfilAntiga !== dto.fotoPerfil) {
              caminhosFicheirosParaRemover.push(
                path.join('uploads/cidadaos/perfil', fotoPerfilAntiga),
              );
            }
          }

          let novaGaleriaCompleta = cidadao.fotosCorpoCompletoBase;
          if (
            dto.fotosCorpoCompleto !== undefined ||
            dto.fotosCorpoCompletoManter !== undefined
          ) {
            const fotosManter = dto.fotosCorpoCompletoManter || [];
            const fotosNovas = dto.fotosCorpoCompleto || [];
            novaGaleriaCompleta = [...fotosManter, ...fotosNovas];

            const fotosParaEliminar = fotosCorpoAntigas.filter(
              (foto) => !fotosManter.includes(foto),
            );
            fotosParaEliminar.forEach((nomeFoto) => {
              caminhosFicheirosParaRemover.push(
                path.join('uploads/cidadaos/corpo_completo', nomeFoto),
              );
            });
          }

          manager.merge(Cidadao, cidadao, {
            ...dto,
            dataNascimento: dto.dataNascimento
              ? new Date(dto.dataNascimento)
              : cidadao.dataNascimento,
            dataInscricao: dto.dataInscricao
              ? new Date(dto.dataInscricao)
              : cidadao.dataInscricao,
            idUltimaModificacao: idUtilizadorLogado,
            fotoPerfil: fotoPerfilAtual,
            fotosCorpoCompleto: novaGaleriaCompleta,
          });

          const salvo = await manager.save(cidadao);

          // Correção da associação: agora utilizando GrauDeficiencia coerentemente
          if (dto.idGrausDeficiencias) {
            await manager.delete(CidadaoDeficiencia, { idCidadao: id });

            for (const idGrauDeficiencia of dto.idGrausDeficiencias) {
              const grauDeficiencia = await manager.findOneBy(GrauDeficiencia, {
                idGrauDeficiencia,
              });
              if (!grauDeficiencia) {
                throw new NotFoundException(
                  `Grau de deficiência [${idGrauDeficiencia}] não cadastrado.`,
                );
              }
              const cd = manager.create(CidadaoDeficiencia, {
                idOrganizacao: idOrganizacaoLogada,
                idCidadao: salvo.idCidadao,
                idGrauDeficiencia: idGrauDeficiencia,
              });
              await manager.save(cd);
            }
          }

          const log = manager.create(AuditoriaSistema, {
            idOrganizacao: idOrganizacaoLogada,
            tabelaAfetada: 'tb_cidadao',
            idRegisto: salvo.idCidadao,
            acao: AcaoAuditoria.EDITAR,
            valorAntigo: valorAntes,
            valorNovo: JSON.parse(JSON.stringify(salvo)),
            idUtilizador: idUtilizadorLogado,
            ip: ipRequest,
          });
          await manager.save(log);

          return salvo;
        },
      );

      // Remoção dos ficheiros físicos executada apenas após o COMMIT com sucesso
      if (caminhosFicheirosParaRemover.length > 0) {
        for (const caminho of caminhosFicheirosParaRemover) {
          await this.uploadService.removerFicheiroFisico(caminho).catch(() => {
            // Silencia ou registra falhas locais de IO para não quebrar a resposta HTTP pós-commit
          });
        }
      }

      return cidadaoSalvo;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException(
        'Falha ao atualizar a ficha do cidadão.',
      );
    }
  }

  async eliminar(id: string): Promise<void> {
    try {
      const cidadao = await this.buscarPorId(id);
      const valorAntes = JSON.parse(JSON.stringify(cidadao));

      const idOrganizacaoLogada = this.cls.get<string>('idOrganizacao');
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');
      const ipRequest = this.cls.get<string>('ip');

      await this.entityManagerHelper.transaction(async (manager) => {
        cidadao.estado = EstadoCidadao.ELIMINADO;
        cidadao.dataEliminacao = new Date();
        cidadao.idUltimaModificacao = idUtilizadorLogado;

        await manager.save(cidadao);

        // Criar Log de Auditoria
        const log = manager.create(AuditoriaSistema, {
          idOrganizacao: idOrganizacaoLogada,
          tabelaAfetada: 'tb_cidadao',
          idRegisto: id,
          acao: AcaoAuditoria.ELIMINAR,
          valorAntigo: valorAntes,
          valorNovo: null,
          idUtilizador: idUtilizadorLogado,
          ip: ipRequest,
        });
        await manager.save(log);
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Falha ao eliminar logicamente o cadastro do cidadão.',
      );
    }
  }

  async buscarPorId(
    id: string,
    manager?: EntityManagerHelper,
  ): Promise<Cidadao> {
    try {
      const query = (manager ?? this.entityManagerHelper)
        .createQueryBuilder(Cidadao, 'c')
        .leftJoinAndSelect('c.bairro', 'b')
        .leftJoinAndSelect('c.organizacao', 'o')
        .leftJoinAndSelect('c.cidadaoDeficiencias', 'cd')
        .leftJoinAndSelect('cd.grauDeficiencia', 'gd')
        .leftJoinAndSelect('gd.deficiencia', 'd')
        .whereEqual('c.idCidadao', id)
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO);

      const papelLogado = this.cls.get<PapelUtilizador>('papel');
      const idOrganizacaoLogada = this.cls.get<string>('idOrganizacao');

      // Restrição Multi-Tenant
      if (papelLogado !== PapelUtilizador.ADMINISTRADOR) {
        query.whereEqual('c.idOrganizacao', idOrganizacaoLogada || '0');
      }

      const cidadao = await query.getOne();
      if (!cidadao) {
        throw new NotFoundException(
          `Cidadão com o ID [${id}] não localizado ou removido.`,
        );
      }

      return cidadao;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Erro ao carregar dados do cidadão.',
      );
    }
  }

  async listar(filtro: FiltroCidadaoDto) {
    try {
      const query = this.construirQueryFiltro(filtro);

      return await query.paginate({
        page: Number(filtro.pagina) || 1,
        limit: Number(filtro.itensPorPagina) || 10,
      });
    } catch (error) {
      // Se o erro já for uma exceção HTTP do NestJS (ex: vinda do construirQueryFiltro), relança-a diretamente
      if (error instanceof HttpException) {
        throw error;
      }

      // Registo do erro físico de paginação nos logs do servidor
      this.logger.error('Falha na paginação da listagem de cidadãos:', error);

      throw new InternalServerErrorException(
        'Ocorreu um erro ao processar a paginação na listagem de cidadãos.',
      );
    }
  }

  private construirQueryFiltro(filtro: FiltroCidadaoDto) {
    try {
      const papelLogado = this.cls.get<PapelUtilizador>('papel');
      const idOrganizacaoLogada = this.cls.get<string>('idOrganizacao');

      const query = this.entityManagerHelper
        .createQueryBuilder(Cidadao, 'c')
        .leftJoinAndSelect('c.bairro', 'b')
        .leftJoinAndSelect('c.organizacao', 'o')
        .leftJoinAndSelect('c.cidadaoDeficiencias', 'cd')
        .leftJoinAndSelect('cd.grauDeficiencia', 'gd')
        .leftJoinAndSelect('gd.deficiencia', 'd')
        .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO)
        .whereEqual('c.genero', filtro.genero)
        .whereIn('c.genero', filtro.generoIn)
        .whereEqual('c.estado', filtro.estado)
        .whereIn('c.estado', filtro.estadoIn)
        .whereEqual('c.idBairro', filtro.idBairro)
        .whereIn('c.idBairro', filtro.idBairroIn)
        .whereEqual('d.idDeficiencia', filtro.idDeficiencia)
        .whereIn('d.idDeficiencia', filtro.idDeficienciaIn)
        .whereEqual('gd.idGrauDeficiencia', filtro.idGrauDeficiencia)
        .whereIn('gd.idGrauDeficiencia', filtro.idGrauDeficienciaIn)
        .whereSearch(['c.nomeCompleto'], filtro.nomeCompleto)
        .whereDateRange(
          'c.dataCriacao',
          filtro.dataInicioCadastro,
          filtro.dataFimCadastro,
        )
        .whereSearch(
          [
            'c.nomeCompleto',
            'c.identificacao',
            'c.descricaoEndereco',
            'c.telefone',
            'b.descricao',
          ],
          filtro.filtroTexto,
        );

      // --- INÍCIO DO AJUSTE: CONVERSÃO DE IDADE EM DATA DE NASCIMENTO ---
      if (filtro.idadeMin !== undefined || filtro.idadeMax !== undefined) {
        const hoje = new Date();

        // Limite Inferior (Mais velhos): Para ter no máximo X anos, deve ter nascido após (hoje - (X + 1) anos)
        const dataMinimaNascimento =
          filtro.idadeMax !== undefined
            ? new Date(
                hoje.getFullYear() - (filtro.idadeMax + 1),
                hoje.getMonth(),
                hoje.getDate() + 1,
              )
            : undefined;

        // Limite Superior (Mais jovens): Para ter no mínimo Y anos, deve ter nascido antes de (hoje - Y anos)
        const dataMaximaNascimento =
          filtro.idadeMin !== undefined
            ? new Date(
                hoje.getFullYear() - filtro.idadeMin,
                hoje.getMonth(),
                hoje.getDate(),
              )
            : undefined;

        if (dataMinimaNascimento && dataMaximaNascimento) {
          query.whereDateRange(
            'c.dataNascimento',
            dataMinimaNascimento,
            dataMaximaNascimento,
          );
        } else if (dataMinimaNascimento) {
          query.whereGreaterThanOrEqual(
            'c.dataNascimento',
            dataMinimaNascimento,
          );
        } else if (dataMaximaNascimento) {
          query.whereLessThanOrEqual('c.dataNascimento', dataMaximaNascimento);
        }
      }
      // --- FIM DO AJUSTE ---

      if (filtro.ordenacao) {
        Object.entries(filtro.ordenacao).forEach(([coluna, direcao], index) => {
          if (index === 0) {
            query.orderBy(`c.${coluna}`, direcao);
          } else {
            query.addOrderBy(`c.${coluna}`, direcao);
          }
        });
      }

      if (papelLogado !== PapelUtilizador.ADMINISTRADOR) {
        query.whereEqual('c.idOrganizacao', idOrganizacaoLogada || '0');
      }

      return query;
    } catch (error) {
      // Registo fidedigno do erro para análise em logs internos do servidor
      this.logger.error(
        'Falha crítica ao estruturar a query de filtragem do cidadão:',
        error,
      );

      throw new InternalServerErrorException(
        'Ocorreu um erro interno ao processar os filtros de pesquisa da base de dados.',
      );
    }
  }

  async obterEstatisticasCards() {
    try {
      // 1. Definição das datas para cálculo de crescimento (Mês Atual vs Mês Anterior)
      const agora = new Date();
      const inicioMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const fimMesAtual = new Date(
        agora.getFullYear(),
        agora.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const inicioMesAnterior = new Date(
        agora.getFullYear(),
        agora.getMonth() - 1,
        1,
      );
      const fimMesAnterior = new Date(
        agora.getFullYear(),
        agora.getMonth(),
        0,
        23,
        59,
        59,
        999,
      );

      // 2. Consultas de contagem utilizando a query base com suporte a Multi-Tenant
      const totalGeral = await this.obterQueryBaseContagem().getCount();

      const totalAtivos = await this.obterQueryBaseContagem()
        .whereEqual('c.estado', EstadoCidadao.ATIVO)
        .getCount();

      const totalPendentes = await this.obterQueryBaseContagem()
        .whereEqual('c.estado', EstadoCidadao.PENDENTE)
        .getCount();

      const totalInativos = await this.obterQueryBaseContagem()
        .whereEqual('c.estado', EstadoCidadao.INATIVO)
        .getCount();

      // 3. Consultas para cálculo do percentual de crescimento mensal (+12% desde o último mês)
      const inscritosMesAtual = await this.obterQueryBaseContagem()
        .whereDateRange('c.dataInscricao', inicioMesAtual, fimMesAtual)
        .getCount();

      const inscritosMesAnterior = await this.obterQueryBaseContagem()
        .whereDateRange('c.dataInscricao', inicioMesAnterior, fimMesAnterior)
        .getCount();

      // 4. Cálculos dos indicadores dinâmicos
      // Crescimento de novas inscrições
      let variacaoInscricoesTexto = '+0% desde o último mês';
      if (inscritosMesAnterior > 0) {
        const variacao = Math.round(
          ((inscritosMesAtual - inscritosMesAnterior) / inscritosMesAnterior) *
            100,
        );
        variacaoInscricoesTexto = `${variacao >= 0 ? '+' : ''}${variacao}% desde o último mês`;
      } else if (inscritosMesAtual > 0) {
        variacaoInscricoesTexto = `+100% desde o último mês`;
      }

      // Percentual de adesão (perfis ativos sobre o total)
      const percentualAdesao =
        totalGeral > 0 ? Math.round((totalAtivos / totalGeral) * 100) : 0;

      // Percentual de rejeição/inativos (perfis inativos sobre o total)
      const percentualRejeicao =
        totalGeral > 0 ? Math.round((totalInativos / totalGeral) * 100) : 0;

      // 5. Estrutura de retorno formatada para os cards do painel
      return {
        totalCidadaos: {
          titulo: 'Total de Cidadãos',
          valor: totalGeral,
          subtexto: variacaoInscricoesTexto,
        },
        perfisAtivos: {
          titulo: 'Perfis Ativos',
          valor: totalAtivos,
          subtexto: `${percentualAdesao}% de adesão na plataforma`,
        },
        pendencias: {
          titulo: 'Pendências',
          valor: totalPendentes,
          subtexto: 'Requer atenção imediata',
        },
        perfisInativos: {
          titulo: 'Perfis Inativos',
          valor: totalInativos,
          subtexto: `${percentualRejeicao}% de rejeição no cadastro`,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao processar as estatísticas do painel.',
      );
    }
  }

  // Método auxiliar privado para reaproveitamento das regras de Multi-Tenant nas contagens
  private obterQueryBaseContagem(): QueryBuilderHelper<Cidadao> {
    const papelLogado = this.cls.get<PapelUtilizador>('papel');
    const idOrganizacaoLogada = this.cls.get<string>('idOrganizacao');

    const query = this.entityManagerHelper
      .createQueryBuilder(Cidadao, 'c')
      .whereNotEqual('c.estado', EstadoCidadao.ELIMINADO);

    if (papelLogado !== PapelUtilizador.ADMINISTRADOR) {
      query.whereEqual('c.idOrganizacao', idOrganizacaoLogada || '0');
    }

    return query;
  }

  // ==========================================
  // EXPORTAÇÃO DE ALTO RENDIMENTO (STREAM)
  // ==========================================

  async exportarExcelProgressivo(
    filtro: ExportarCidadaoDto,
    response: Response,
  ): Promise<void> {
    try {
      const idOrganizacaoLogada = this.cls.get<string>('idOrganizacao');
      const idUtilizadorLogado = this.cls.get<string>('idUtilizador');
      const ipRequest = this.cls.get<string>('ip');

      response.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      response.setHeader(
        'Content-Disposition',
        'attachment; filename="cadastro-cidadaos.xlsx"',
      );

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: response,
        useStyles: true,
        useSharedStrings: true,
      });

      const worksheet = workbook.addWorksheet('Cidadãos com Deficiência');

      worksheet.columns = [
        { header: 'ID Cidadão', key: 'idCidadao', width: 36 },
        { header: 'Administração Municipal', key: 'organizacao', width: 40 },
        { header: 'Nome Completo', key: 'nomeCompleto', width: 40 },
        { header: 'Tipo Identificação', key: 'tipoIdentificacao', width: 25 },
        { header: 'Nº Identificação', key: 'identificacao', width: 25 },
        { header: 'Data Nascimento', key: 'dataNascimento', width: 20 },
        { header: 'Telefone', key: 'telefone', width: 20 },
        { header: 'Bairro', key: 'bairro', width: 30 },
        { header: 'Endereço Detalhado', key: 'endereco', width: 50 },
        { header: 'Data Inscrição', key: 'dataInscricao', width: 20 },
        { header: 'Tipologias de Deficiência', key: 'deficiencias', width: 40 },
        { header: 'Observações', key: 'observacoes', width: 40 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1F497D' },
      };

      let paginaAtual = 1;
      const limiteLote = 250;
      let temMaisRegistos = true;

      while (temMaisRegistos) {
        const offset = (paginaAtual - 1) * limiteLote;

        // Executa busca direta sem realizar o COUNT no banco de dados
        const itens = await this.construirQueryFiltro(filtro)
          .take(limiteLote)
          .skip(offset)
          .getMany();

        for (const cidadao of itens) {
          const deficienciasTexto = cidadao.cidadaoDeficiencias
            .map((cd) => cd.grauDeficiencia?.deficiencia?.descricao)
            .filter(Boolean)
            .join(', ');

          worksheet
            .addRow({
              idCidadao: cidadao.idCidadao,
              organizacao: cidadao.organizacao?.descricao,
              nomeCompleto: cidadao.nomeCompleto,
              tipoIdentificacao: cidadao.tipoIdentificacao,
              identificacao: cidadao.identificacao,
              dataNascimento: cidadao.dataNascimento,
              telefone: cidadao.telefone || 'N/A',
              bairro: cidadao.bairro?.descricao,
              endereco: cidadao.descricaoEndereco,
              dataInscricao: cidadao.dataInscricao,
              deficiencias: deficienciasTexto,
              observacoes: cidadao.observacoes || 'Sem notas adicionais.',
            })
            .commit();
        }

        if (itens.length < limiteLote) {
          temMaisRegistos = false;
        } else {
          paginaAtual++;
        }
      }

      await workbook.commit();

      await this.entityManagerHelper.transaction(async (manager) => {
        const log = manager.create(AuditoriaSistema, {
          idOrganizacao: idOrganizacaoLogada || 'GLOBAL',
          tabelaAfetada: 'tb_cidadao',
          idRegisto: 'EXPORTAÇÃO_GERAL',
          acao: AcaoAuditoria.EXPORTAR,
          valorAntigo: { filtrosAplicados: filtro },
          valorNovo: null,
          idUtilizador: idUtilizadorLogado,
          ip: ipRequest,
        });
        await manager.save(log);
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Ocorreu uma falha no fluxo de geração e streaming do relatório Excel.',
      );
    }
  }
}
