import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  Length,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';
import { PapelUtilizador, EstadoUtilizador } from '../enums/utilizador.enum';
import { Type } from 'class-transformer';

export class CriarUtilizadorDto {
  @IsNotEmpty({ message: 'O nome completo do utilizador é obrigatório.' })
  @IsString({ message: 'O nome deve ser uma cadeia de caracteres válida.' })
  @Length(3, 150, { message: 'O nome deve conter entre 3 e 150 caracteres.' })
  nomeCompleto: string;

  @IsNotEmpty({ message: 'O endereço de e-mail é obrigatório.' })
  @IsEmail({}, { message: 'Insira um endereço de e-mail com formato válido.' })
  email: string;

  @IsNotEmpty({ message: 'A palavra-passe temporária é obrigatória.' })
  @Length(6, 40, {
    message: 'A palavra-passe deve conter entre 6 e 40 caracteres.',
  })
  senha: string;

  @IsNotEmpty({ message: 'O papel de acesso é obrigatório.' })
  @IsEnum(PapelUtilizador, {
    message: 'O papel fornecido não é reconhecido pelo sistema.',
  })
  papel: PapelUtilizador;
}

export class EditarUtilizadorDto {
  @IsOptional()
  @IsString()
  @Length(3, 150)
  nomeCompleto?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsOptional()
  @IsEnum(PapelUtilizador)
  papel?: PapelUtilizador;

  @IsOptional()
  @IsEnum(EstadoUtilizador)
  estado?: EstadoUtilizador;
}

export class LoginDto {
  @IsNotEmpty({ message: 'O preenchimento do e-mail é obrigatório.' })
  @IsEmail({}, { message: 'E-mail com formato inválido.' })
  email: string;

  @IsNotEmpty({ message: 'O preenchimento da palavra-passe é obrigatório.' })
  @IsString()
  senha: string;
}

export class FiltroUtilizadorDto {
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
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(PapelUtilizador)
  papel?: PapelUtilizador;

  @IsOptional()
  @IsEnum(EstadoUtilizador)
  estado?: EstadoUtilizador;
}
