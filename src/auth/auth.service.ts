import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AuthRegisterResultDto,
  AuthTokensDto,
  AuthUserDto,
} from './auth.types';

type PasswordResetRecord = {
  userId: string;
  expiresAt: number;
};

@Injectable()
export class AuthService {
  private readonly passwordResetTokens = new Map<string, PasswordResetRecord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private toUserDto(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  private async issueTokens(user: {
    id: string;
    email: string;
  }): Promise<AuthTokensDto> {
    const accessSecret =
      this.config.get<string>('JWT_ACCESS_SECRET', { infer: true }) ?? '';
    const refreshSecret =
      this.config.get<string>('JWT_REFRESH_SECRET', { infer: true }) ?? '';

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret: accessSecret, expiresIn: '1h' },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret: refreshSecret, expiresIn: '30d' },
    );

    return { accessToken, refreshToken };
  }

  async register(input: {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthRegisterResultDto> {
    if (input.password !== input.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    const tokens = await this.issueTokens({ id: user.id, email: user.email });
    return { user: this.toUserDto(user), tokens };
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<AuthTokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens({ id: user.id, email: user.email });
  }

  async me(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.toUserDto(user);
  }

  async forgotPassword(email: string): Promise<{ token?: string }> {
    // Always return success (avoid user enumeration).
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return {};
    }

    // Simple 6-digit OTP token for dev/testing.
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.passwordResetTokens.set(token, { userId: user.id, expiresAt });

    // In production you'd email/SMS the token, not return it.
    const env =
      this.config.get<string>('NODE_ENV', { infer: true }) ?? 'development';
    if (env === 'production') return {};
    return { token };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = this.passwordResetTokens.get(token);
    if (!record) {
      throw new BadRequestException('Invalid or expired token');
    }
    if (Date.now() > record.expiresAt) {
      this.passwordResetTokens.delete(token);
      throw new BadRequestException('Invalid or expired token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    this.passwordResetTokens.delete(token);
  }
}
