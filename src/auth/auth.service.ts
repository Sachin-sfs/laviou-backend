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

@Injectable()
export class AuthService {
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
}
