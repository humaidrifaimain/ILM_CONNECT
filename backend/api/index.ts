import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Use require() to avoid TS call-signature issues with namespace imports
// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');

const expressApp = express();

const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://ilm-connect-nine.vercel.app',
];

function parseCorsOrigins(): string[] {
  const configuredOrigins = [process.env.CORS_ORIGINS, process.env.FRONTEND_URL]
    .filter(Boolean)
    .flatMap((o) => (o as string).split(','))
    .map((o) => o.trim())
    .filter(Boolean);
  return [...new Set([...defaultCorsOrigins, ...configuredOrigins])];
}

let nestApp: any = null;

async function bootstrap() {
  if (nestApp) return;

  const adapter = new ExpressAdapter(expressApp);
  nestApp = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn'],
  });

  nestApp.setGlobalPrefix('api/v1');
  nestApp.use(
    cookieParser(
      process.env.SESSION_SECRET || 'ilmconnect-session-secret-key-2026',
    ),
  );

  const allowedOrigins = parseCorsOrigins();
  nestApp.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('IlmConnect API Portal')
    .setDescription('Production-grade modular backend API for IlmConnect.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth('session')
    .build();
  const document = SwaggerModule.createDocument(nestApp, swaggerConfig);
  SwaggerModule.setup('api/docs', nestApp, document);

  await nestApp.init();
}

export default async function handler(req: any, res: any) {
  await bootstrap();
  expressApp(req, res);
}
