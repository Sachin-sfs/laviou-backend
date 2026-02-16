import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ok } from '../common/api';
import { ApiJwtAuth } from '../common/swagger';
import { JwtAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login and get JWT tokens' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'Logged in',
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  async login(@Body() body: LoginDto) {
    const tokens = await this.auth.login(body);
    return ok(tokens, 'Logged in');
  }

  @Post('register')
  @ApiOperation({ summary: 'Create an account' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'Registered',
        data: {
          user: {
            id: 'b3d3f8f7-7b6c-4f8f-b8fd-0b7dfdf9f2cb',
            email: 'user@example.com',
            firstName: 'Jane',
            lastName: 'Doe',
          },
          tokens: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
      },
    },
  })
  async register(@Body() body: RegisterDto) {
    const result = await this.auth.register(body);
    return ok(result, 'Registered');
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout (stateless)' })
  @ApiOkResponse({
    schema: {
      example: { success: true, message: 'Logged out', data: true },
    },
  })
  logout() {
    // Stateless JWT: frontend can just delete cookie/token.
    return ok(true as const, 'Logged out');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiJwtAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'OK',
        data: {
          id: 'b3d3f8f7-7b6c-4f8f-b8fd-0b7dfdf9f2cb',
          email: 'user@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
        },
      },
    },
  })
  async me(@Req() req: Request) {
    const userId = req.user?.userId;
    // JwtAuthGuard guarantees user exists, this is just for type safety.
    if (!userId) throw new UnauthorizedException();
    const user = await this.auth.me(userId);
    return ok(user, 'OK');
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset token (OTP)' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'If the email exists, a reset code was sent.',
        data: { token: '123456' },
      },
    },
  })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const res = await this.auth.forgotPassword(body.email);
    return ok(res, 'If the email exists, a reset code was sent.');
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with OTP/token' })
  @ApiOkResponse({
    schema: {
      example: { success: true, message: 'Password reset', data: true },
    },
  })
  async resetPassword(@Body() body: ResetPasswordDto) {
    if (!body.password) throw new BadRequestException('Password is required');
    await this.auth.resetPassword(body.token, body.password);
    return ok(true as const, 'Password reset');
  }
}
