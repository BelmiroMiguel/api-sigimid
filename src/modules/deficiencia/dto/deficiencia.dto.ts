import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  Length,
  Max,
  MaxLength,
  MinLength,
  IsBooleanString,
  IsBoolean,
} from 'class-validator';
import { EstadoDeficiencia } from '../enums/deficiencia.enum';
import { GrauDeficiencia } from '../entities/grau-deficiencia.entity';
import { Type } from 'class-transformer';

export class CriarDeficienciaDto {
  @IsNotEmpty({
    message: 'A descrição da tipologia de deficiência é obrigatória.',
  })
  @IsString({
    message: 'A descrição deve ser uma cadeia de caracteres válida.',
  })
  descricao: string;

  @IsNotEmpty({
    message: 'Adicione pelo menos um grau a deficiência.',
  })
  @MaxLength(4, {
    each: true,
    message: 'São permitidos apenas 4 graus de deficiência',
  })
  @MinLength(1, {
    each: true,
    message: 'Adicione pelo menos um grau a deficiência para proceguir.',
  })
  @IsArray({
    each: true,
    message: 'Os grau da deficiência não estão no formato válido',
  })
  graus: string[];
}

export class EditarDeficienciaDto {
  @IsOptional()
  @IsString({
    message: 'A descrição deve ser uma cadeia de caracteres válida.',
  })
  descricao?: string;

  @IsOptional()
  @IsEnum(EstadoDeficiencia, { message: 'O estado fornecido não é válido.' })
  estado?: EstadoDeficiencia;
}

export class FiltroDeficienciaDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  itensPorPagina?: number = 10;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsEnum(EstadoDeficiencia)
  estado?: EstadoDeficiencia;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  semPaginacao?: boolean;
}
