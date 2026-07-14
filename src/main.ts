import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Configura o Validador Global com uma única mensagem na exceção
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove propriedades que não estão no DTO
      forbidNonWhitelisted: false, // Lança erro se enviarem propriedades não permitidas
      transform: true, // Transforma os tipos automaticamente com base no DTO
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Customização para extrair apenas a PRIMEIRA mensagem de erro de validação
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const firstError = validationErrors[0];

        // Se o erro tiver sub-erros (objetos aninhados), procura recursivamente
        let currentError = firstError;
        while (currentError.children && currentError.children.length > 0) {
          currentError = currentError.children[0];
        }

        // Extrai o texto da primeira regra de validação que falhou
        const message = currentError.constraints
          ? Object.values(currentError.constraints)[0]
          : 'Erro de validação de dados.';

        return new BadRequestException(message);
      },
    }),
  );

  app.enableCors();
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Configura a Rota/API Global Core (Define o prefixo '/api' para todos os endpoints)
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
