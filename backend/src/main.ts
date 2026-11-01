import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: process.env.NODE_ENV !== 'production' ? { level: 'info' } : false,
    trustProxy: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter
  );

  // Enable CORS for dashboard and external API clients
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // Global exception filter for RFC 7807 and OpenAI error parity
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`\n======================================================`);
  console.log(`🚀 YOYO Cloud Gateway running on port ${port}`);
  console.log(`📡 Public Edge Endpoint: https://api.yoyo.ai/v1`);
  console.log(`🏥 Health Telemetry: https://api.yoyo.ai/v1/health`);
  console.log(`======================================================\n`);
}

bootstrap().catch((err) => {
  console.error('Fatal startup error in YOYO Backend:', err);
  process.exit(1);
});

