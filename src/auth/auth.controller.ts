import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ok } from '../common/api';
import { ApiJwtAuth } from '../common/swagger';
import { JwtAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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
  @HttpCode(501)
  forgotPassword() {
    // Not implemented yet (no email service wired).
    return ok(null, 'Not implemented');
  }

  @Post('reset-password')
  @HttpCode(501)
  resetPassword() {
    return ok(null, 'Not implemented');
  }
}
