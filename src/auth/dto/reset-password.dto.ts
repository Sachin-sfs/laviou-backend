import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: '123456',
    description: 'OTP/token received from forgot-password',
  })
  @IsString()
  @MinLength(4)
  token!: string;

  @ApiProperty({ example: 'NewPassword123' })
  @IsString()
  @MinLength(8)
  password!: string;
}
