import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'Acesso negado. Utilizador não autenticado.',
      );
    }

    // Mapeamento dinâmico de Perfis para as suas respetivas permissões de escrita/leitura
    const permissoesPorPerfil: Record<string, string[]> = {
      ADMINISTRADOR: [
        'organizacao.gerir',
        'utilizador.gerir',
        'geografia.gerir',
        'deficiencia.gerir',
        'cidadao.criar',
        'cidadao.editar',
        'cidadao.eliminar',
        'cidadao.exportar',
        'cidadao.consultar',
      ],
      SUPERVISOR: [
        'cidadao.criar',
        'cidadao.editar',
        'cidadao.exportar',
        'cidadao.consultar',
      ],
      CADASTRADOR: ['cidadao.criar', 'cidadao.editar', 'cidadao.consultar'],
      CONSULTA: ['cidadao.consultar'],
    };

    const permissoesDoUtilizador = permissoesPorPerfil[user.perfil] || [];

    const possuiPermissao = requiredPermissions.every((permissao) =>
      permissoesDoUtilizador.includes(permissao),
    );

    if (!possuiPermissao) {
      throw new ForbiddenException(
        'Acesso negado. Perfil de acesso não possui permissões suficientes para esta operação.',
      );
    }

    return true;
  }
}
