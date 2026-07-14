import {
  IsOptional,
  IsDateString,
  IsUUID,
  IsEnum,
  IsArray,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EstadoRegistoDashboard } from '../enums/dashboard.enum';

export class FiltroDashboardDto {
  // === FILTRO TEMPORAL ===
  @IsOptional()
  @IsDateString(
    {},
    {
      message:
        'A data inicial de inscrição deve ter o formato ISO-8601 válido.',
    },
  )
  dataInscricaoInicio?: string;

  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'A data final de inscrição deve ter o formato ISO-8601 válido.',
    },
  )
  dataInscricaoFim?: string;

  // === FILTRO GEOGRÁFICO EM CASCATA ===
  @IsOptional()
  @IsUUID('4', {
    message: 'O ID da província selecionada deve ser um UUID válido.',
  })
  idProvincia?: string;

  @IsOptional()
  @IsUUID('4', {
    message: 'O ID do município selecionado deve ser um UUID válido.',
  })
  idMunicipio?: string;

  @IsOptional()
  @IsUUID('4', {
    message: 'O ID do bairro selecionado deve ser um UUID válido.',
  })
  idBairro?: string;

  // === FILTRO CLÍNICO (SELEÇÃO MÚLTIPLA) ===
  @IsOptional()
  @Transform(({ value }) => {
    // Trata e normaliza o parâmetro caso seja enviado como string única (separada por vírgulas) no URL
    if (typeof value === 'string') {
      return value.split(',');
    }
    return value;
  })
  @IsArray({
    message:
      'Os IDs das deficiências devem ser transmitidos em formato de vetor.',
  })
  @IsString({
    each: true,
    message:
      'Cada ID de deficiência dentro do vetor deve ser uma cadeia de caracteres.',
  })
  @IsUUID('4', {
    each: true,
    message: 'Cada identificador de deficiência deve ser um UUID válido.',
  })
  idsDeficiencias?: string[];

  // === FILTRO DE ESTADO OPERACIONAL ===
  @IsOptional()
  @IsEnum(EstadoRegistoDashboard, {
    message: 'O estado de registo selecionado para filtragem é inválido.',
  })
  estado?: EstadoRegistoDashboard;
}
