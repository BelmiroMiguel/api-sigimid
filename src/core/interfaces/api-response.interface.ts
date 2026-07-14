export interface IPaginacaoResponse {
  pagina: number;
  totalItens: number;
  totalPaginas: number;
  itensPorPagina: number;
}

export interface IApiResponse<T> {
  message: string;
  body: T;
  token?: string;
  paginacao?: IPaginacaoResponse;
  filtros?: Record<string, unknown>;
  ordenacao?: Record<string, 'ASC' | 'DESC'>;
}