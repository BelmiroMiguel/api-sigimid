import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { EstadoGeografia } from '../enums/geografia.enum';

// === PROVÍNCIA ===
export class CriarProvinciaDto {
  @IsNotEmpty({ message: 'A descrição da província é obrigatória.' })
  @IsString({ message: 'A descrição deve ser uma cadeia de caracteres.' })
  descricao: string;
}

export class EditarProvinciaDto {
  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsEnum(EstadoGeografia)
  estado?: EstadoGeografia;
}

export class FiltroProvinciaDto {
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
  @IsEnum(EstadoGeografia)
  estado?: EstadoGeografia;
}

// === MUNICÍPIO ===
export class CriarMunicipioDto {
  @IsNotEmpty({
    message: 'A associação de uma província (idProvincia) é obrigatória.',
  })
  @IsUUID('4', { message: 'O ID da província deve ser um UUID válido.' })
  idProvincia: string;

  @IsNotEmpty({ message: 'A descrição do município é obrigatória.' })
  @IsString({ message: 'A descrição deve ser uma cadeia de caracteres.' })
  descricao: string;
}

export class EditarMunicipioDto {
  @IsOptional()
  @IsUUID('4')
  idProvincia?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsEnum(EstadoGeografia)
  estado?: EstadoGeografia;
}

export class FiltroMunicipioDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  itensPorPagina?: number = 10;

  @IsOptional()
  @IsUUID('4')
  idProvincia?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsEnum(EstadoGeografia)
  estado?: EstadoGeografia;
}

// === BAIRRO ===
export class CriarBairroDto {
  @IsNotEmpty({
    message: 'A associação de um município (idMunicipio) é obrigatória.',
  })
  @IsUUID('4', { message: 'O ID do município deve ser um UUID válido.' })
  idMunicipio: string;

  @IsNotEmpty({ message: 'A descrição do bairro é obrigatória.' })
  @IsString({ message: 'A descrição deve ser uma cadeia de caracteres.' })
  descricao: string;
}

export class EditarBairroDto {
  @IsOptional()
  @IsUUID('4')
  idMunicipio?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsEnum(EstadoGeografia)
  estado?: EstadoGeografia;
}

export class FiltroBairroDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  itensPorPagina?: number = 10;

  @IsOptional()
  @IsUUID('4')
  idMunicipio?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsEnum(EstadoGeografia)
  estado?: EstadoGeografia;
}
