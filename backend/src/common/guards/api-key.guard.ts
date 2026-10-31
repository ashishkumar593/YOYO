import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing API key. Provide your key via "Authorization: Bearer sk_live_..." header.'
      );
    }

    const rawKey = authHeader.replace('Bearer ', '').trim();
    if (!rawKey.startsWith('sk_live_')) {
      throw new UnauthorizedException('Invalid API key format. Expected prefix "sk_live_".');
    }

    const keyData = await this.apiKeysService.validateKey(rawKey);
    if (!keyData) {
      throw new UnauthorizedException('API key is invalid, revoked, or expired.');
    }

    // Attach verified API key and user context to request
    request.apiKey = keyData;
    request.user = { id: keyData.userId, role: keyData.userRole };

    return true;
  }
}

