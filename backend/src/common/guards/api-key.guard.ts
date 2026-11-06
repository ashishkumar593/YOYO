import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';
import { JwtService } from '@nestjs/jwt';
import { estimateMessagesTokens, estimateTokens } from '../utils/token-estimator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private apiKeysService: ApiKeysService,
    @Optional() private jwtService?: JwtService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing authorization. Provide your key via "Authorization: Bearer sk_live_..." or session token.'
      );
    }

    const rawKey = authHeader.replace('Bearer ', '').trim();

    // 1. Check if standard API key with prefix sk_live_
    if (rawKey.startsWith('sk_live_')) {
      const keyData = await this.apiKeysService.validateKey(rawKey);
      if (!keyData) {
        throw new UnauthorizedException('API key is invalid, revoked, or expired.');
      }

      // Enforce sliding-window RPM rate limits
      if (keyData.rateLimitRpm) {
        const rateCheck = await this.apiKeysService.checkRateLimit(keyData.keyId, keyData.rateLimitRpm);
        if (!rateCheck.allowed) {
          throw new HttpException(
            {
              error: {
                message: `Rate limit exceeded: Maximum ${keyData.rateLimitRpm} requests per minute allowed for this API key.`,
                type: 'rate_limit_exceeded',
                code: 429,
              },
            },
            HttpStatus.TOO_MANY_REQUESTS
          );
        }
      }

      // Enforce sliding-window TPM (tokens-per-minute) rate limits
      if (keyData.rateLimitTpm) {
        let estimatedTokens = 50;
        if (request.body?.messages) {
          estimatedTokens = estimateMessagesTokens(request.body.messages);
        } else if (typeof request.body?.input === 'string') {
          estimatedTokens = estimateTokens(request.body.input);
        } else if (Array.isArray(request.body?.input)) {
          estimatedTokens = request.body.input.reduce(
            (acc: number, str: string) => acc + estimateTokens(str),
            0
          );
        }

        const tpmCheck = await this.apiKeysService.checkTokenRateLimit(
          keyData.keyId,
          keyData.rateLimitTpm,
          estimatedTokens
        );

        if (!tpmCheck.allowed) {
          throw new HttpException(
            {
              error: {
                message: `Rate limit exceeded: Maximum ${keyData.rateLimitTpm} tokens per minute allowed for this API key.`,
                type: 'rate_limit_exceeded',
                code: 429,
              },
            },
            HttpStatus.TOO_MANY_REQUESTS
          );
        }
      }

      // Attach verified API key and user context to request
      request.apiKey = keyData;
      request.user = { id: keyData.userId, role: keyData.userRole };
      return true;
    }

    // 2. Otherwise verify JWT access token for Web Playground & Dashboard testing
    if (this.jwtService) {
      try {
        const payload = this.jwtService.verify(rawKey, {
          secret: process.env.JWT_SECRET || 'super_secret_jwt_key_for_yoyo_platform_replace_in_prod',
        });
        if (payload && payload.sub) {
          request.apiKey = { allowedModels: ['*'] };
          request.user = { id: payload.sub, role: payload.role };
          return true;
        }
      } catch {}
    }

    throw new UnauthorizedException('Invalid API key or authentication session token.');
  }
}


