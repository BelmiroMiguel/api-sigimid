import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EntityManagerHelper } from '@2bbelmiro/typeorm-query-buider-helper';
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

      // Lista temporária de caminhos para eliminação física segura pós-commit
      const caminhosFicheirosParaRemover: string[] = [];

      return await this.entityManagerHelper.transaction(async (manager) => {
        // Se exitir uma nova foto de perfil, pega o caminho da foto antiga para remover
        let fotoPerfilAtual = cidadao.fotoPerfilBase;
        if (dto.fotoPerfil) {
          fotoPerfilAtual = dto.fotoPerfil;
          if (fotoPerfilAntiga && fotoPerfilAntiga !== dto.fotoPerfil) {
            caminhosFicheirosParaRemover.push(
              path.join('uploads/cidadaos/perfil', fotoPerfilAntiga),
            );
          }
        }

        // Processar Galeria das Fotos de Corpo Completo (Mesclagem)
        let novaGaleriaCompleta = cidadao.fotosCorpoCompletoBase;
        // Se o Front-end enviou novas fotos OU indicou a lista de manutenção, gerimos a galeria
        if (
          dto.fotosCorpoCompleto !== undefined ||
          dto.fotosCorpoCompletoManter !== undefined
        ) {
          const fotosManter = dto.fotosCorpoCompletoManter || [];
          const fotosNovas = dto.fotosCorpoCompleto || [];
          novaGaleriaCompleta = [...fotosManter, ...fotosNovas];

          // Identificar fotos removidas pelo utilizador no Front-end para limpeza física
          const fotosParaEliminar = fotosCorpoAntigas.filter(
            (foto) => !fotosManter.includes(foto),
          );
          fotosParaEliminar.forEach((nomeFoto) => {
            caminhosFicheirosParaRemover.push(
              path.join('uploads/cidadaos/corpo_completo', nomeFoto),
            );
          });
        }

        // Atualizar campos do cidadão
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

        const cidadaoSalvo = await manager.save(cidadao);

        // Se fornecidas, atualizar a lista polinomial de deficiências (Limpar e Reinserir)
        if (dto.idGrausDeficiencias) {
          await manager.delete(CidadaoDeficiencia, { idCidadao: id });

          for (const idDeficiencia of dto.idGrausDeficiencias) {
            const deficiencia = await manager.findOneBy(Deficiencia, {
              idDeficiencia,
            });
            if (!deficiencia) {
              throw new NotFoundException(
                `Deficiência [${idDeficiencia}] não cadastrada.`,
              );
            }
            const cd = manager.create(CidadaoDeficiencia, {
              idOrganizacao: idOrganizacaoLogada,
              idCidadao: cidadaoSalvo.idCidadao,
              idDeficiencia: idDeficiencia,
            });
            await manager.save(cd);
          }
        }

        // Criar Log de Auditoria
        const log = manager.create(AuditoriaSistema, {
          idOrganizacao: idOrganizacaoLogada,
          tabelaAfetada: 'tb_cidadao',
          idRegisto: cidadaoSalvo.idCidadao,
          acao: AcaoAuditoria.EDITAR,
          valorAntigo: valorAntes,
          valorNovo: JSON.parse(JSON.stringify(cidadaoSalvo)),
          idUtilizador: idUtilizadorLogado,
          ip: ipRequest,
        });
        await manager.save(log);

        // Eliminar fisicamente do disco após COMMIT com sucesso
        if (caminhosFicheirosParaRemover.length > 0) {
          for (const caminho of caminhosFicheirosParaRemover) {
            await this.uploadService.removerFicheiroFisico(caminho);
          }
        }

        return cidadaoSalvo;
      });
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

  async buscarPorId(id: string, manager?: EntityManager): Promise<Cidadao> {
    try {
      const query = this.entityManagerHelper
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
      throw new InternalServerErrorException(
        'Erro de paginação na listagem de cidadãos.',
      );
    }
  }

  private construirQueryFiltro(filtro: FiltroCidadaoDto) {
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
      .whereSearch(
        [
          'c.nomeCompleto',
          'c.identificacao',
          'c.descricaoEndereco',
          'c.telefone ',
          'b.descricao',
          '',
        ],
        filtro.nomeCompleto,
      )
      .whereLike('c.identificacao', filtro.identificacao)
      .whereIn('c.idBairro', filtro.idBairroIn)
      .whereLike('c.idBairro', filtro.idBairro)
      .whereLike('cd.idDeficiencia', filtro.idDeficiencia)
      .whereGreaterThanOrEqual(
        'c.dataInscricao',
        filtro.dataInicio ? new Date(filtro.dataInicio) : undefined,
      )
      .whereLessThanOrEqual(
        'c.dataInscricao',
        filtro.dataFim ? new Date(filtro.dataFim) : undefined,
      )
      .orderBy('c.nomeCompleto', 'ASC');

    // Restrição Multi-Tenant
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

      // 1. Configurar Cabeçalhos HTTP para Transferência Chunked Binária Progressiva
      response.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      response.setHeader(
        'Content-Disposition',
        'attachment; filename="cadastro-cidadaos.xlsx"',
      );

      // 2. Instanciar o WorkbookWriter de Escrita de Baixíssimo Consumo em Disco/RAM (exceljs)
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: response,
        useStyles: true,
        useSharedStrings: true,
      });

      const worksheet = workbook.addWorksheet('Cidadãos com Deficiência');

      // Formatar Cabeçalhos da Folha Excel
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

      // Formatar estilo do cabeçalho
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1F497D' },
      };

      // 3. Obter a Query Base para Carregamento sob Lotes Paginados (Cursor Progressivo)
      const query = this.construirQueryFiltro(filtro);

      let paginaAtual = 1;
      const limiteLote = 250; // Escreve 250 linhas na memória por vez antes de descarregar (Flush)
      let temMaisRegistos = true;

      while (temMaisRegistos) {
        const paginado = await query.paginate({
          page: paginaAtual,
          limit: limiteLote,
        });

        for (const cidadao of paginado.items) {
          // Reunir as deficiências diagnosticadas num único texto para o relatório
          const deficienciasTexto = cidadao.cidadaoDeficiencias
            .map((cd) => cd.grauDeficiencia?.deficiencia.descricao)
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
            .commit(); // Limpa a linha da RAM e joga direto para o Stream de Resposta HTTP!
        }

        if (paginado.meta.currentPage >= paginado.meta.totalPages) {
          temMaisRegistos = false;
        } else {
          paginaAtual++;
        }
      }

      // Finalizar escrita do Excel
      await workbook.commit();

      // Gravar Log de Auditoria da Exportação de Dados do Cidadão
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
