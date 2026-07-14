import { EntityManagerHelper } from '@2bbelmiro/typeorm-query-buider-helper';
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { DatabaseSeedService } from './database-seed.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: (process.env.DB_TYPE || 'mysql') as any,
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '20_Waltersk_00',
      database: process.env.DB_NAME || 'bd_sigim',
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      synchronize: true, // process.env.APP_ENV === 'desenvolvimento', // Desativar obrigatoriamente em Produção
      logging: process.env.APP_ENV === 'desenvolvimento',
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
export class DatabaseModule {}
