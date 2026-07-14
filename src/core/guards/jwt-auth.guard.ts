import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from 'nestjs-cls';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { EntityManagerHelper } from '@2bbelmiro/typeorm-query-buider-helper';
import { Utilizador } from '../../modules/utilizador/entities/utilizador.entity';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly cls: ClsService,
    private readonly entityManagerHelper: EntityManagerHelper,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido.');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Utilização do QueryBuilderHelper para verificar o estado do utilizador em tempo real
      const utilizador = await this.entityManagerHelper
        .createQueryBuilder(Utilizador, 'utilizador')
        .whereEqual('utilizador.idUtilizador', payload.sub || 0)
        .whereEqual('utilizador.estado', 'ATIVO')
        .getOne();

      if (!utilizador) {
        throw new UnauthorizedException(
          'Utilizador inativo, banido ou não encontrado.',
        );
      }

      // Preenchimento do contexto do utilizador no request
      request.user = utilizador;

      // Regra CLS-First: Injetar chaves no escopo isolado do ClsService
      this.cls.set('idUtilizador', utilizador.idUtilizador);
      this.cls.set('idOrganizacao', utilizador.idOrganizacao);
      this.cls.set('papel', utilizador.papel);
      this.cls.set('utilizador', utilizador);

      return true;
    } catch (err) {
      throw new UnauthorizedException(
        'Token de autenticação inválido ou expirado.',
      );
    }
  }
}
