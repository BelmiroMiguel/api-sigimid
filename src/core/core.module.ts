import { Module, Global } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClsModule } from 'nestjs-cls';
import { DatabaseModule } from './database/database.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DispositivoInterceptor } from './interceptors/dispositivo.interceptor';
import { RolesPapelUtilizadorGuard } from './guards/roles-papel-utilizador.guard';
import { UploadService } from './upload/upload.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'fallback-secret-key-123',
      signOptions: { expiresIn: (process.env.JWT_EXPIRATION || '1d') as any },
    }),
    DatabaseModule,
  ],
  providers: [
    UploadService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesPapelUtilizadorGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DispositivoInterceptor,
    },
  ],
  exports: [
    DatabaseModule,
    ClsModule,
    JwtModule,
    ClsModule,
    ConfigModule,
    UploadService,
  ],
})
export class CoreModule {}
