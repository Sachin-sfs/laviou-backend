import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AppEnv } from '../config/env';
import { EmailService } from '../email/email.service';
import type {
  AuthRegisterResultDto,
  AuthTokensDto,
  AuthUserDto,
} from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppEnv, true>,
    private readonly email: EmailService,
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

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private safeEquals(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  }

  private createOtp(): string {
    // 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private createResetToken(): string {
    // 32 bytes -> 64 hex chars
    return randomBytes(32).toString('hex');
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

    // persist refresh token hash for "real logout" + rotation
    const refreshTokenHash = this.hashToken(refreshToken);
    const refreshTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash, refreshTokenExpiresAt },
    });

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

  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    const refreshSecret =
      this.config.get<string>('JWT_REFRESH_SECRET', { infer: true }) ?? '';
    if (!refreshSecret)
      throw new UnauthorizedException('Invalid refresh token');

    let payload: { sub: string; email: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        refreshTokenHash: true,
        refreshTokenExpiresAt: true,
      },
    });
    if (!user?.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (Date.now() > user.refreshTokenExpiresAt.getTime()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const presentedHash = this.hashToken(refreshToken);
    if (!this.safeEquals(user.refreshTokenHash, presentedHash)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // rotate refresh token
    return this.issueTokens({ id: user.id, email: user.email });
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
    });
  }

  async me(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.toUserDto(user);
  }

  async forgotPassword(email: string): Promise<{ sent: true }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('Email not found');
    }

    const otp = this.createOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        otpHash: this.hashToken(otp),
        otpExpiresAt,
      },
      select: { id: true },
    });

    await this.email.sendPasswordResetOtp(email, otp);

    // Never return OTP in API response.
    return { sent: true as const };
  }

  async verifyResetOtp(input: {
    email: string;
    otp: string;
  }): Promise<{ resetToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    // Avoid leaking whether the email exists; use a generic error.
    if (!user) throw new BadRequestException('Invalid code');

    const now = new Date();
    const request = await this.prisma.passwordResetRequest.findFirst({
      where: {
        userId: user.id,
        otpExpiresAt: { gt: now },
        verifiedAt: null,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, otpHash: true },
    });

    if (!request) throw new BadRequestException('Invalid code');

    const presentedHash = this.hashToken(input.otp);
    if (!this.safeEquals(request.otpHash, presentedHash)) {
      throw new BadRequestException('Invalid code');
    }

    const resetToken = this.createResetToken();
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.passwordResetRequest.update({
      where: { id: request.id },
      data: {
        verifiedAt: now,
        resetTokenHash: this.hashToken(resetToken),
        resetTokenExpiresAt,
      },
      select: { id: true },
    });

    return { resetToken };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const now = new Date();
    const resetTokenHash = this.hashToken(token);

    const request = await this.prisma.passwordResetRequest.findFirst({
      where: {
        resetTokenHash,
        resetTokenExpiresAt: { gt: now },
        verifiedAt: { not: null },
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userId: true },
    });

    if (!request) throw new BadRequestException('Invalid or expired token');

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: request.userId },
        data: {
          passwordHash,
          refreshTokenHash: null,
          refreshTokenExpiresAt: null,
        },
      }),
      this.prisma.passwordResetRequest.update({
        where: { id: request.id },
        data: { usedAt: now },
      }),
    ]);
  }
}
