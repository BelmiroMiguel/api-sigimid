import { SetMetadata } from '@nestjs/common';
import { PapelUtilizador } from '../../modules/utilizador/enums/utilizador.enum';

export const ROLE_PAPEL_UTILIZADOR_KEY = 'role_papel_utilizador';
export const RolesPapelUtilizador = (...roles: PapelUtilizador[]) =>
  SetMetadata(ROLE_PAPEL_UTILIZADOR_KEY, roles);
