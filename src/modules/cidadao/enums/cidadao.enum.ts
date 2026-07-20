export enum TipoIdentificacaoCidadao {
  BI = 'BI',
  PASSAPORTE = 'PASSAPORTE',
  CERTIDAO_NASCIMENTO = 'CERTIDAO_NASCIMENTO',
}

export enum EstadoCidadao {
  ATIVO = 'ATIVO',
  INATIVO = 'INATIVO',
  ELIMINADO = 'ELIMINADO',
  PENDENTE = 'PENDENTE',
}

export enum AcaoAuditoria {
  CRIAR = 'CRIAR',
  EDITAR = 'EDITAR',
  ELIMINAR = 'ELIMINAR',
  EXPORTAR = 'EXPORTAR',
}

export enum FormatoExportacao {
  EXCEL = 'EXCEL',
  PDF = 'PDF',
}

export enum GrauDeficiencia {
  LEVE = 'LEVE',
  MODERADO = 'MODERADO',
  GRAVE = 'GRAVE',
  PROFUNDO = 'PROFUNDO',
}

export enum Genero {
  MASCULINO = 'm',
  FEMININO = 'f',
}

export enum CidadaoOrdenacaoColunas {
  NOME_COMPLETO = 'nomeCompleto',
  DATA_INSCRICAO = 'dataCriacao',
  DATA_NASCIMENTO = 'dataNascimento',
  GENERO = 'genero',
}
