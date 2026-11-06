import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  async createEndpoint(
    userId: string,
    dto: {
      url: string;
      description?: string;
      events?: string[];
    }
  ) {
    if (!dto.url || !dto.url.startsWith('https://') && !dto.url.startsWith('http://')) {
      throw new BadRequestException('A valid webhook URL (http:// or https://) is required.');
    }

    // Limit to max 10 webhooks per tenant
    const count = await this.prisma.webhookEndpoint.count({ where: { userId } });
    if (count >= 10) {
      throw new BadRequestException('Maximum limit of 10 webhook endpoints reached.');
    }

    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    return this.prisma.webhookEndpoint.create({
      data: {
        userId,
        url: dto.url,
        secret,
        description: dto.description || null,
        events: dto.events && dto.events.length > 0 ? dto.events : ['*'],
        status: 'ACTIVE',
      },
    });
  }

  async listEndpoints(userId: string) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { userId },
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return endpoints.map((ep) => ({
      ...ep,
      secret: `${ep.secret.slice(0, 10)}...${ep.secret.slice(-4)}`,
      totalDeliveries: ep._count.deliveries,
    }));
  }

  async getEndpoint(userId: string, endpointId: string) {
    const ep = await this.prisma.webhookEndpoint.findFirst({
      where: { id: endpointId, userId },
      include: {
        deliveries: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ep) {
      throw new NotFoundException(`Webhook endpoint with ID '${endpointId}' not found.`);
    }

    return ep;
  }

  async deleteEndpoint(userId: string, endpointId: string) {
    const ep = await this.prisma.webhookEndpoint.findFirst({
      where: { id: endpointId, userId },
    });

    if (!ep) {
      throw new NotFoundException(`Webhook endpoint with ID '${endpointId}' not found.`);
    }

    await this.prisma.webhookEndpoint.delete({
      where: { id: endpointId },
    });

    return { id: endpointId, deleted: true };
  }

  async triggerTestPing(userId: string, endpointId: string) {
    const ep = await this.prisma.webhookEndpoint.findFirst({
      where: { id: endpointId, userId },
    });

    if (!ep) {
      throw new NotFoundException(`Webhook endpoint with ID '${endpointId}' not found.`);
    }

    const testPayload = {
      event: 'ping',
      timestamp: new Date().toISOString(),
      data: {
        message: 'YOYO Webhook Dispatcher test ping payload. Connection successful.',
        endpoint_id: ep.id,
      },
    };

    return this.deliverEvent(ep, 'ping', testPayload);
  }

  async dispatch(userId: string, eventType: string, data: any) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    const matching = endpoints.filter(
      (ep) => ep.events.includes('*') || ep.events.includes(eventType)
    );

    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const ep of matching) {
      setImmediate(() => {
        this.deliverEvent(ep, eventType, payload).catch((err) => {
          this.logger.error(`Webhook delivery failed to ${ep.url}: ${err.message}`);
        });
      });
    }
  }

  private async deliverEvent(ep: any, eventType: string, payload: any) {
    const start = Date.now();
    const timestamp = Math.floor(Date.now() / 1000);
    const bodyStr = JSON.stringify(payload);

    // Compute standard HMAC-SHA256 signature
    const signature = crypto
      .createHmac('sha256', ep.secret)
      .update(`${timestamp}.${bodyStr}`)
      .digest('hex');

    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let success = false;

    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Yoyo-Webhook-Dispatcher/1.0.0',
          'X-Yoyo-Signature': `t=${timestamp},v1=${signature}`,
          'X-Yoyo-Event': eventType,
        },
        body: bodyStr,
        signal: AbortSignal.timeout(5000), // 5s delivery timeout
      });

      statusCode = res.status;
      success = res.ok;
      const text = await res.text().catch(() => '');
      responseBody = text.slice(0, 500); // Record first 500 chars of response
    } catch (err: any) {
      statusCode = 0;
      responseBody = err.message || 'Connection error';
      success = false;
    }

    const latencyMs = Date.now() - start;

    await this.prisma.webhookDelivery.create({
      data: {
        endpointId: ep.id,
        eventType,
        payload,
        statusCode,
        responseBody,
        latencyMs,
        success,
      },
    });

    return {
      success,
      statusCode,
      latencyMs,
      responseBody,
    };
  }
}
