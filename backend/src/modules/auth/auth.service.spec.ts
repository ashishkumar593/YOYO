import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      session: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
      },
      userProfile: {
        upsert: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockImplementation((payload) => Promise.resolve(`jwt_mock_${payload.sub}`)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw ConflictException if email is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'usr_1', email: 'taken@yoyo.ai' });

      await expect(
        service.register({ email: 'taken@yoyo.ai', password: 'Password123!' })
      ).rejects.toThrow(ConflictException);
    });

    it('should register first user as SUPER_ADMIN with quota and return access tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(0);

      const createdUser = {
        id: 'usr_admin',
        email: 'admin@yoyo.ai',
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
      };
      prisma.user.create.mockResolvedValue(createdUser);

      const result = await service.register({
        email: 'admin@yoyo.ai',
        password: 'Password123!',
        fullName: 'Lead Engineer',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'admin@yoyo.ai',
            role: UserRole.SUPER_ADMIN,
            status: UserStatus.ACTIVE,
          }),
        })
      );
      expect(result.user.id).toBe('usr_admin');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should register subsequent users as USER role', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(5);

      const createdUser = {
        id: 'usr_dev',
        email: 'dev@yoyo.ai',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
      };
      prisma.user.create.mockResolvedValue(createdUser);

      const result = await service.register({
        email: 'dev@yoyo.ai',
        password: 'Password123!',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.USER,
          }),
        })
      );
      expect(result.user.role).toBe(UserRole.USER);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@yoyo.ai', password: 'password' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is suspended', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_sus',
        email: 'sus@yoyo.ai',
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.login({ email: 'sus@yoyo.ai', password: 'password' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password hash does not match', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 8);
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        email: 'dev@yoyo.ai',
        passwordHash,
        status: UserStatus.ACTIVE,
        role: UserRole.USER,
      });

      await expect(
        service.login({ email: 'dev@yoyo.ai', password: 'WrongPassword' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should login successfully, store session, and return tokens', async () => {
      const plainPassword = 'CorrectPassword123!';
      const passwordHash = await bcrypt.hash(plainPassword, 8);
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        email: 'dev@yoyo.ai',
        passwordHash,
        status: UserStatus.ACTIVE,
        role: UserRole.USER,
        profile: { fullName: 'Dev User' },
      });
      prisma.session.create.mockResolvedValue({ id: 'sess_1' });

      const result = await service.login(
        { email: 'dev@yoyo.ai', password: plainPassword },
        'Mozilla/5.0',
        '127.0.0.1'
      );

      expect(result.user.email).toBe('dev@yoyo.ai');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'usr_1',
            userAgent: 'Mozilla/5.0',
            ipAddress: '127.0.0.1',
          }),
        })
      );
    });
  });

  describe('refreshToken', () => {
    it('should throw UnauthorizedException if refresh token is missing', async () => {
      await expect(service.refreshToken('')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if session is expired', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'sess_old',
        expiresAt: new Date(Date.now() - 10000), // Expired
        user: { id: 'usr_1', email: 'dev@yoyo.ai', role: UserRole.USER },
      });
      prisma.session.delete.mockResolvedValue({});

      await expect(service.refreshToken('mock_token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 'sess_old' } });
    });

    it('should rotate session and return new tokens when valid', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'sess_valid',
        userAgent: 'Chrome',
        ipAddress: '192.168.1.1',
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'usr_1', email: 'dev@yoyo.ai', role: UserRole.USER },
      });
      prisma.session.delete.mockResolvedValue({});
      prisma.session.create.mockResolvedValue({ id: 'sess_new' });

      const result = await service.refreshToken('valid_token');

      expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 'sess_valid' } });
      expect(prisma.session.create).toHaveBeenCalled();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('updatePassword', () => {
    it('should throw BadRequestException if current password does not match', async () => {
      const passwordHash = await bcrypt.hash('OldPassword123!', 8);
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        passwordHash,
      });

      await expect(
        service.updatePassword('usr_1', 'WrongOldPassword', 'NewPassword123!')
      ).rejects.toThrow(BadRequestException);
    });

    it('should update password and invalidate all existing sessions', async () => {
      const passwordHash = await bcrypt.hash('OldPassword123!', 8);
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        passwordHash,
      });
      prisma.user.update.mockResolvedValue({});
      prisma.session.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.updatePassword('usr_1', 'OldPassword123!', 'NewPassword123!');

      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'usr_1' } });
      expect(result.success).toBe(true);
    });
  });

  describe('getMe', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('usr_missing')).rejects.toThrow(NotFoundException);
    });

    it('should return user with number-converted quota metrics', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        email: 'test@yoyo.ai',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        profile: { fullName: 'Test User' },
        quota: {
          monthlyTokenLimit: BigInt(5000000),
          currentMonthTokensUsed: BigInt(125000),
        },
        createdAt: new Date(),
      });

      const user = await service.getMe('usr_1');
      expect(user.email).toBe('test@yoyo.ai');
      expect(user.quota?.monthlyTokenLimit).toBe(5000000);
      expect(user.quota?.currentMonthTokensUsed).toBe(125000);
    });
  });
});

