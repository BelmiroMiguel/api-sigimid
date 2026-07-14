import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_PAPEL_UTILIZADOR_KEY } from '../decorators/roles-papel-utilizador.decorator';
import { PapelUtilizador } from '../../modules/utilizador/enums/utilizador.enum';

@Injectable()
export class RolesPapelUtilizadorGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PapelUtilizador[]>(
      ROLE_PAPEL_UTILIZADOR_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se a rota não exigir papéis específicos de utilizador, o acesso é livre para utilizadores autenticados
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificação estrita do atributo de domínio 'papel'
    if (!user || !user.papel) {
      throw new ForbiddenException(
        'Acesso negado. Papel de utilizador não identificado.',
      );
    }

    const possuiPapelNecessario = requiredRoles.includes(
      user.papel as PapelUtilizador,
    );

    if (!possuiPapelNecessario) {
      throw new ForbiddenException(
        `Acesso negado. Esta operação exige um dos seguintes papéis de utilizador: [${requiredRoles.join(', ')}]. O seu papel atual é: [${user.papel}].`,
      );
    }

    return true;
  }
}
