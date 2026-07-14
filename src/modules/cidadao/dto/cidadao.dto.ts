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
} from 'class-validator';
import {
  TipoIdentificacaoCidadao,
  EstadoCidadao,
  FormatoExportacao,
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

  @IsNotEmpty({ message: 'Associe pelo menos uma tipologia de deficiência.' })
  @IsArray({
    each: true,
    message: 'As deficiências devem ser fornecidas como uma lista de IDs.',
  })
  //@IsUUID('4', {
  //  each: true,
  //  message: 'Cada ID de deficiência deve ser um UUID válido.',
  //})
  @IsOptional()
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
  @IsString()
  nomeCompleto?: string;

  @IsOptional()
  @IsString()
  identificacao?: string;

  @IsOptional()
  //@IsUUID('4')
  idBairro?: string;

  @IsOptional()
  @IsArray()
  idBairroIn?: string[];

  @IsOptional()
  @IsEnum(TipoIdentificacaoCidadao, { each: true })
  @IsArray()
  @Transform((v) => (Array.isArray(v.value) ? v.value : [v.value]))
  tipoIdentificacaoIn?: TipoIdentificacaoCidadao[];

  @IsOptional()
  @IsEnum(TipoIdentificacaoCidadao)
  tipoIdentificacao?: TipoIdentificacaoCidadao;

  @IsOptional()
  //@IsUUID('4')
  idDeficiencia?: string;

  @IsOptional()
  @IsArray()
  idDeficienciaIn?: string[];

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;
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
