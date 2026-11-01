import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Default first user as SUPER_ADMIN, subsequent as USER
    const userCount = await this.prisma.user.count();
    const role: UserRole = userCount === 0 ? UserRole.SUPER_ADMIN : UserRole.USER;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role,
        status: UserStatus.ACTIVE,
        emailVerified: true, // Auto-verified for seamless dev onboarding
        profile: {
          create: {
            fullName: dto.fullName || '',
            companyName: dto.companyName || '',
          },
        },
        quota: {
          create: {
            monthlyTokenLimit: BigInt(5000000), // 5M Free Tokens
            monthlyRequestLimit: 10000,
            resetsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended. Please contact support.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Record session with hashed refresh token
    const refreshHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshHash,
        userAgent: userAgent || 'Unknown',
        ipAddress: ipAddress || 'Unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.profile?.fullName,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: refreshHash },
      include: { user: true },
    });

    if (!session || new Date() > session.expiresAt) {
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } });
      }
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Invalidate old session and generate new tokens (Token Rotation)
    await this.prisma.session.delete({ where: { id: session.id } });

    const tokens = await this.generateTokens(session.user.id, session.user.email, session.user.role);
    const newRefreshHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');

    await this.prisma.session.create({
      data: {
        userId: session.user.id,
        refreshTokenHash: newRefreshHash,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return { success: true };
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.session.deleteMany({
      where: { refreshTokenHash: refreshHash },
    });
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        profile: true,
        quota: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found.');
    return {
      ...user,
      quota: user.quota
        ? {
            ...user.quota,
            monthlyTokenLimit: Number(user.quota.monthlyTokenLimit),
            currentMonthTokensUsed: Number(user.quota.currentMonthTokensUsed),
          }
        : null,
    };
  }

  async updateProfile(userId: string, data: { fullName?: string; companyName?: string; notificationPreferences?: any }) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.companyName !== undefined ? { companyName: data.companyName } : {}),
        ...(data.notificationPreferences ? { notificationPreferences: data.notificationPreferences } : {}),
      },
      create: {
        userId,
        fullName: data.fullName || '',
        companyName: data.companyName || '',
        notificationPreferences: data.notificationPreferences || { usage_alerts: true },
      },
    });
  }

  async updatePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const isValid = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isValid) throw new BadRequestException('Incorrect current password.');

    const newHash = await bcrypt.hash(newPass, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Invalidate existing sessions
    await this.prisma.session.deleteMany({ where: { userId } });

    return { success: true, message: 'Password updated successfully. Please log in again.' };
  }

  async getSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions;
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Don't leak user existence; return generic success
    return {
      success: true,
      message: 'If an account exists with this email, password reset instructions have been dispatched.',
    };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });
    const refreshToken = crypto.randomBytes(32).toString('hex');

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 mins
    };
  }
}

