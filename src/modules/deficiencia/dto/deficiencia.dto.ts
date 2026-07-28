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
import {
  CondicaoEspecialOrdenacaoColunas,
  EstadoDeficiencia,
} from '../enums/deficiencia.enum';
import { GrauDeficiencia } from '../entities/grau-deficiencia.entity';
import { Transform, Type } from 'class-transformer';

export class CriarCondicaoEspecialDto {
  @IsNotEmpty({
    message: 'A descrição da tipologia de deficiência é obrigatória.',
  })
  @IsString({
    message: 'A descrição deve ser uma cadeia de caracteres válida.',
  })
  descricao: string;
}

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
  @IsArray({
    message: 'Os grau da deficiência não estão no formato válido',
  })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  graus: string[];
}

export class EditarDeficienciaDto {
  @IsOptional()
  @IsString({
    message: 'A descrição deve ser uma cadeia de caracteres válida.',
  })
  descricao?: string;

  @IsNotEmpty({
    message: 'Adicione pelo menos um grau a deficiência.',
  })
  @IsArray({
    message: 'Os grau da deficiência não estão no formato válido',
  })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  graus: string[];
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

  @IsOptional()
  @IsString()
  direction: 'ASC' | 'DESC' = 'ASC';

  @IsOptional()
  @IsString()
  @IsEnum(CondicaoEspecialOrdenacaoColunas)
  ordenacao?: CondicaoEspecialOrdenacaoColunas;
}

export class FiltroCondicaoEspecialDto extends FiltroDeficienciaDto {}
