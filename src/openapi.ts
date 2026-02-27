import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function generate() {
  // Avoid DB connections during spec generation.
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Stock SaaS API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Send a valid JWT access token. This API also accepts the access token via cookie (see cookie auth).',
      },
      'bearer',
    )
    .addCookieAuth('accessToken', {
      type: 'apiKey',
      in: 'cookie',
      description:
        'Optional. If present, the API will read the access token from this cookie.',
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const outDir = join(process.cwd(), 'docs');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'openapi.json'),
    JSON.stringify(document, null, 2),
  );

  await app.close();
}

void generate();
