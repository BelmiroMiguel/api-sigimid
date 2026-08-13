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
  Matches,
  IsArray,
} from 'class-validator';
import { PapelUtilizador, EstadoUtilizador } from '../enums/utilizador.enum';
import { Transform, Type } from 'class-transformer';

export class CriarUtilizadorDto {
  @IsNotEmpty({ message: 'O nome completo do utilizador é obrigatório.' })
  @IsString({ message: 'O nome deve ser uma cadeia de caracteres válida.' })
  @Length(3, 150, { message: 'O nome deve conter entre 3 e 150 caracteres.' })
  nomeCompleto: string;

  @IsNotEmpty({ message: 'O endereço de e-mail é obrigatório.' })
  @IsEmail({}, { message: 'Insira um endereço de e-mail com formato válido.' })
  email: string;

  @IsOptional()
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

  @IsNotEmpty({ message: 'O telefone é obrigatório.' })
  @IsString()
  @Matches(/^(\+244){0,1}\s{0,1}(\d{3}\s{0,1}){3}$/, {
    message: 'O telefone deve estar no formato válido',
  })
  telefone?: string;

  @IsOptional()
  fotoPerfil?: string;
}
export class EditarSenhaUtilizadorDto {
  @IsNotEmpty({ message: 'A palavra-passe atual é obrigatória.' })
  @Length(6, 40, {
    message: 'A palavra-passe deve conter entre 6 e 40 caracteres.',
  })
  senhaAtual: string;
  @IsNotEmpty({ message: 'Adicoine uma nova palavra-passe.' })
  @Length(6, 40, {
    message: 'A palavra-passe deve conter entre 6 e 40 caracteres.',
  })
  novaSenha: string;
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
  @Matches(/^(\+244){0,1}\s{0,1}(\d{3}\s{0,1}){3}$/, {
    message: 'O telefone deve estar no formato válido',
  })
  telefone?: string;

  @IsOptional()
  @IsEnum(PapelUtilizador)
  papel?: PapelUtilizador;

  @IsOptional()
  @IsEnum(EstadoUtilizador)
  estado?: EstadoUtilizador;

  @IsOptional()
  fotoPerfil?: string;
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
  @IsString()
  filtroTexto?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(PapelUtilizador)
  papel?: PapelUtilizador;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  papelIn?: string[];

  @IsOptional()
  @IsEnum(EstadoUtilizador)
  estado?: EstadoUtilizador;
}
