import { EntityManagerHelper } from '@2bbelmiro/typeorm-query-buider-helper';
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { DatabaseSeedService } from './database-seed.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // Deteta automaticamente se deve usar SSL (obrigatório para o Render/Aiven)
        const dbUrl = configService.get<string>('DATABASE_URL');
        const isProduction = configService.get<string>('APP_ENV') !== 'desenvolvimento';

        return {
          type: (configService.get<string>('DB_TYPE') || 'mysql') as any,
          url: dbUrl || undefined, // Usa o URL completo se existir

          // Se não houver DATABASE_URL, usa as propriedades individuais
          ...(!dbUrl && {
            host: configService.get<string>('DB_HOST') || 'localhost',
            port: Number(configService.get<string>('DB_PORT')) || 3306,
            username: configService.get<string>('DB_USER') || 'root',
            password: configService.get<string>('DB_PASS') || '',
            database: configService.get<string>('DB_NAME') || 'bd_sigimd',
          }),

          // Mantém o mapeamento automático das entidades de forma assíncrona
          entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
          autoLoadEntities: true,

          // Configurações de ambiente
          synchronize: true, // Mantido ativo conforme o seu código original
          logging: !isProduction,

          // Configuração de SSL dinâmica para nuvem (Render/Aiven)
          ...((dbUrl || isProduction) && {
            ssl: {
              rejectUnauthorized: false,
            },
          }),
        };
      },
    }),
  ],
  providers: [
    DatabaseSeedService,
    {
      provide: EntityManagerHelper,
      useFactory: (entityManager: EntityManager) => {
        return new EntityManagerHelper(entityManager);
      },
      inject: [EntityManager],
    },
  ],
  exports: [TypeOrmModule, EntityManagerHelper],
})
export class DatabaseModule { }
