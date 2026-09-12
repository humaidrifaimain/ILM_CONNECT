import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://ilm-connect-nine.vercel.app',
];

function parseCorsOrigins() {
  const configuredOrigins = [
    process.env.CORS_ORIGINS,
    process.env.FRONTEND_URL,
  ]
    .filter(Boolean)
    .flatMap((origins) => origins!.split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...defaultCorsOrigins, ...configuredOrigins]));
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Set global API prefix
  app.setGlobalPrefix('api/v1');

  // Enforce secure cookie parser
  app.use(cookieParser(process.env.SESSION_SECRET || 'ilmconnect-session-secret-key-2026'));

  const allowedCorsOrigins = parseCorsOrigins();

  // Enable CORS with credentials for local and deployed Next.js clients
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedCorsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Setup Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('IlmConnect API Portal')
    .setDescription('Production-grade modular backend API for the IlmConnect Online Islamic Education Platform.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth('session')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3002; // Updated default port to avoid conflict
  await app.listen(port);
  
  logger.log(`=============================================================`);
  logger.log(`🚀 ILMCONNECT BACKEND ACTIVE`);
  logger.log(`🌍 Main API Endpoint: http://localhost:${port}/api/v1`);
  logger.log(`📖 Swagger API Docs Panel: http://localhost:${port}/api/docs`);
  logger.log(`=============================================================`);
}
bootstrap();
