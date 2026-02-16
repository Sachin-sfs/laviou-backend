import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { requestLogger } from './common/request-logger';
import type { AppEnv } from './config/env';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get<ConfigService<AppEnv, true>>(ConfigService);
  const corsOriginRaw = config.get<AppEnv['CORS_ORIGIN']>('CORS_ORIGIN') ?? '*';
  const corsOrigin =
    corsOriginRaw.trim() === '*'
      ? true
      : corsOriginRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

  app.enableCors({
    origin: corsOrigin,
    credentials: corsOrigin !== true,
  });

  app.setGlobalPrefix('api');
  app.use(requestLogger);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Laviou API')
    .setDescription('NestJS + Prisma API for Laviou frontend.')
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();
  const document: OpenAPIObject = SwaggerModule.createDocument(
    app,
    swaggerConfig,
  );
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = config.get<AppEnv['PORT']>('PORT') ?? 3000;
  await app.listen(port);
}
void bootstrap();
