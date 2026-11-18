import { Controller, Get, Header } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      platform: 'YOYO Enterprise Cloud AI Model API Platform',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        chatCompletions: '/v1/chat/completions',
        embeddings: '/v1/embeddings',
        rerank: '/v1/rerank',
        models: '/v1/models',
        batches: '/v1/batches',
        files: '/v1/files',
        health: '/v1/health',
        metrics: '/metrics',
        openapi: '/openapi.json',
      },
      docs: '/docs',
    };
  }

  @Get('openapi.json')
  @Header('Content-Type', 'application/json')
  getOpenApiSpec() {
    const candidates = [
      path.join(process.cwd(), '../doc/openapi.json'),
      path.join(process.cwd(), 'doc/openapi.json'),
      path.join(__dirname, '../doc/openapi.json'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
    }

    return {
      openapi: '3.1.0',
      info: { title: 'YOYO Cloud AI Platform', version: '1.0.0' },
      paths: {},
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'yoyo-backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('v1/health')
  getV1Health() {
    return {
      status: 'healthy',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
