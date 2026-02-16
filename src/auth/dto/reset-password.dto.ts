import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'b8c10f2e6b1c4a78b4bdf11d9e8e37d4d1a1d8d6f0a4d7f2b3c8f3d7a1b2c3d4',
    description:
      'Reset token returned from verify-reset-otp (NOT the OTP itself)',
  })
  @IsString()
  @MinLength(32)
  token!: string;

  @ApiProperty({ example: 'NewPassword123' })
  @IsString()
  @MinLength(8)
  password!: string;
}
