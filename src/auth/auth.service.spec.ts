import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwtService: { sign: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };

    authService = new AuthService(prisma as unknown as PrismaService, jwtService as unknown as JwtService);
  });

  describe('register', () => {
    it('throws a ConflictException if the email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        authService.register({ email: 'taken@example.com', password: 'password123', name: 'Someone' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a user and returns an access token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'new@example.com',
        role: 'USER',
        name: 'New User',
      });

      const result = await authService.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('signed-token');
      expect(result.user.email).toBe('new@example.com');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException for a wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash,
        role: 'USER',
        name: 'User',
      });

      await expect(
        authService.login({ email: 'user@example.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns an access token for correct credentials', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash,
        role: 'USER',
        name: 'User',
      });

      const result = await authService.login({ email: 'user@example.com', password: 'correct-password' });
      expect(result.accessToken).toBe('signed-token');
    });
  });
});
