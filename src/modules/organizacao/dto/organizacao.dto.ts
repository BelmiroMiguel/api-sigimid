import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  Matches,
  IsInt,
  Min,
} from 'class-validator';
import { EstadoOrganizacao } from '../enums/organizacao.enum';

export class CriarOrganizacaoDto {
  @IsNotEmpty({
    message: 'A descrição da Administração Municipal é obrigatória.',
  })
  @IsString({
    message: 'A descrição deve ser uma cadeia de caracteres válida.',
  })
  descricao: string;

  @IsNotEmpty({ message: 'O NIF da organização é obrigatório.' })
  @IsString({ message: 'O NIF deve ser uma cadeia de caracteres válida.' })
  @Matches(/^\d{10}$/, {
    message:
      'O NIF em Angola deve possuir exatamente 10 dígitos numéricos para entidades coletivas.',
  })
  identificacao: string;
}

export class EditarOrganizacaoDto {
  @IsOptional()
  @IsString({
    message: 'A descrição deve ser uma cadeia de caracteres válida.',
  })
  descricao?: string;

  @IsOptional()
  @Matches(/^\d{10}$/, {
    message: 'O NIF em Angola deve possuir exatamente 10 dígitos numéricos.',
  })
  identificacao?: string;

  @IsOptional()
  @IsEnum(EstadoOrganizacao, { message: 'O estado fornecido não é válido.' })
  estado?: EstadoOrganizacao;
}

export class FiltroOrganizacaoDto {
  @IsOptional()
  @IsInt({ message: 'A página deve ser um número inteiro.' })
  @Min(1, { message: 'A página mínima admissível é 1.' })
  pagina?: number = 1;

  @IsOptional()
  @IsInt({ message: 'O limite de itens deve ser um número inteiro.' })
  @Min(1, { message: 'O limite mínimo admissível é 1.' })
  itensPorPagina?: number = 10;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  identificacao?: string;

  @IsOptional()
  @IsEnum(EstadoOrganizacao)
  estado?: EstadoOrganizacao;
}
