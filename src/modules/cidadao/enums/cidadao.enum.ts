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
