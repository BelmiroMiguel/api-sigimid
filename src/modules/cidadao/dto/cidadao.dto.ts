import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  IsDateString,
  IsInt,
  Min,
  Matches,
  ValidateIf,
  IsObject,
} from 'class-validator';
import {
  TipoIdentificacaoCidadao,
  EstadoCidadao,
  FormatoExportacao,
  CidadaoOrdenacaoColunas,
} from '../enums/cidadao.enum';
import { Transform, Type } from 'class-transformer';

export class CriarCidadaoDto {
  @IsNotEmpty({ message: 'O nome completo do cidadão é obrigatório.' })
  @IsString()
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message:
      'O nome do cidadão não deve conter caracteres especiais ou numéricos.',
  })
  nomeCompleto: string;

  @IsNotEmpty({
    message: 'O tipo de documento de identificação é obrigatório.',
  })
  @IsEnum(TipoIdentificacaoCidadao, {
    message: 'Tipo de identificação inválido.',
  })
  tipoIdentificacao: TipoIdentificacaoCidadao;

  @IsNotEmpty({
    message: 'O número do documento de identificação é obrigatório.',
  })
  @IsString()
  @ValidateIf((o) => o.tipoIdentificacao === TipoIdentificacaoCidadao.BI)
  @Matches(/^\d{9}[A-Z]{2}\d{3}$/, {
    message:
      'O formato do Bilhete de Identidade (BI) angolano é inválido (Formato correto: 9 dígitos, 2 letras maiúsculas, 3 dígitos).',
  })
  @ValidateIf(
    (o) => o.tipoIdentificacao === TipoIdentificacaoCidadao.CERTIDAO_NASCIMENTO,
  )
  @Matches(/^\d{3,}$/, {
    message:
      'A certidão de nascimento ou processo administrativo deve ser estritamente numérica e conter pelo menos 3 caracteres.',
  })
  identificacao: string;

  @IsNotEmpty({ message: 'A data de nascimento é obrigatória.' })
  @IsDateString(
    {},
    { message: 'A data de nascimento deve ter um formato de data válido.' },
  )
  dataNascimento: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+244){0,1}\s{0,1}(\d{3}\s{0,1}){3}$/, {
    message:
      'O telefone deve estar no formato internacional angolano (+244XXXXXXXXX).',
  })
  telefone?: string;

  @IsNotEmpty({ message: 'O bairro de residência é obrigatório.' })
  //@IsUUID('4', { message: 'O ID do bairro deve ser um UUID válido.' })
  idBairro: string;

  @IsNotEmpty({ message: 'O endereço detalhado é obrigatório.' })
  @IsString()
  descricaoEndereco: string;

  @IsNotEmpty({ message: 'A data de inscrição é obrigatória.' })
  @IsDateString()
  dataInscricao: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Associe pelo menos uma tipologia de deficiência.' })
  @IsArray({
    message: 'As deficiências devem ser fornecidas como uma lista de IDs.',
  })
  @Transform((v) => (Array.isArray(v.value) ? v.value : [v.value]))
  grausDeficiencias: string[];

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsString()
  fotoPerfil?: string; // Injetado pelo CidadaoPerfilUploadInterceptor

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotosCorpoCompleto?: string[]; // Injetado pelo CidadaoCorpoUploadInterceptor
}

export class EditarCidadaoDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/)
  nomeCompleto?: string;

  @IsOptional()
  @IsEnum(TipoIdentificacaoCidadao)
  tipoIdentificacao?: TipoIdentificacaoCidadao;

  @IsOptional()
  @IsString()
  identificacao?: string;

  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @IsOptional()
  @IsDateString()
  dataInscricao?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+244\d{9}$/)
  telefone?: string;

  @IsOptional()
  @IsUUID('4')
  idBairro?: string;

  @IsOptional()
  @IsString()
  descricaoEndereco?: string;

  @IsOptional()
  @IsArray()
  @Transform((v) => (Array.isArray(v.value) ? v.value : [v.value]))
  //@IsUUID('4', { each: true })
  idGrausDeficiencias?: string[];

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsEnum(EstadoCidadao)
  estado?: EstadoCidadao;

  @IsOptional()
  @IsString()
  fotoPerfil?: string; // Novo nome de perfil enviado (se houver alteração)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotosCorpoCompleto?: string[]; // Novos uploads de corpo inteiro

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotosCorpoCompletoManter?: string[]; // Nomes de ficheiros antigos a manter na galeria (enviado pelo Front-end)
}

export class FiltroCidadaoDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pagina?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  itensPorPagina?: number = 10;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  idadeMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  idadeMax?: number;

  @IsOptional()
  @IsString()
  filtroTexto?: string;

  @IsOptional()
  @IsString()
  nomeCompleto?: string;

  @IsOptional()
  @IsString()
  genero?: string;

  // NOVO: Validação para array de géneros selecionados
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  generoIn?: string[];

  @IsOptional()
  @IsString()
  identificacao?: string;

  @IsOptional()
  @IsEnum(TipoIdentificacaoCidadao)
  tipoIdentificacao?: TipoIdentificacaoCidadao;

  @IsOptional()
  @IsEnum(TipoIdentificacaoCidadao, { each: true })
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tipoIdentificacaoIn?: TipoIdentificacaoCidadao[];

  // NOVO: Validação para estado singular (Ativo, Pendente, etc.)
  @IsOptional()
  @IsEnum(EstadoCidadao)
  estado?: EstadoCidadao;

  // NOVO: Validação para array de estados selecionados
  @IsOptional()
  @IsEnum(EstadoCidadao, { each: true })
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  estadoIn?: EstadoCidadao[];

  @IsOptional()
  //@IsUUID('4')
  idBairro?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  idBairroIn?: string[];

  // NOVO: Validação para ID de Deficiência singular
  @IsOptional()
  @IsString()
  idDeficiencia?: string;

  // NOVO: Validação para array de IDs de Deficiências
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  idDeficienciaIn?: string[];

  // NOVO: Validação para ID de Grau de Deficiência singular
  @IsOptional()
  @IsString()
  idGrauDeficiencia?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  idGrauDeficienciaIn?: string[];

  @IsOptional()
  @IsDateString()
  dataInicioCadastro?: string;

  @IsOptional()
  @IsDateString()
  dataFimCadastro?: string;

  @IsOptional()
  @IsObject({
    message: 'A propriedade de ordenação deve ser um objeto válido.',
  })
  @Transform(({ value }) => {
    // Caso chegue como string JSON do front-end, faz o parse preventivo
    if (typeof value === 'string' && value.trim()) {
      try {
        value = JSON.parse(value);
      } catch {
        return undefined;
      }
    }

    if (typeof value !== 'object' || value === null) return undefined;

    const objetoSanitizado: Record<string, 'ASC' | 'DESC'> = {};
    const colunasValidas = Object.values(CidadaoOrdenacaoColunas) as string[];

    for (const [coluna, direcao] of Object.entries(value)) {
      const direcaoUpper = String(direcao).toUpperCase();

      if (
        colunasValidas.includes(coluna) &&
        (direcaoUpper === 'ASC' || direcaoUpper === 'DESC')
      ) {
        objetoSanitizado[coluna] = direcaoUpper;
      }
    }

    return Object.keys(objetoSanitizado).length > 0
      ? objetoSanitizado
      : undefined;
  })
  ordenacao?: Record<CidadaoOrdenacaoColunas, 'ASC' | 'DESC'>;
}

export class ExportarCidadaoDto {
  @IsNotEmpty({ message: 'O formato de exportação é obrigatório (EXCEL).' })
  @IsEnum(FormatoExportacao)
  formato: FormatoExportacao;

  @IsOptional()
  @IsUUID('4')
  idBairro?: string;

  @IsOptional()
  @IsUUID('4')
  idDeficiencia?: string;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;
}
