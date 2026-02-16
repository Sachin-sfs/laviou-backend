import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class GiftItemDto {
  @ApiProperty({ example: 'item-id' })
  @IsString()
  @MinLength(1)
  itemId!: string;

  @ApiProperty({ example: 'friend@example.com' })
  @IsEmail()
  recipientEmail!: string;

  @ApiPropertyOptional({ example: 'Enjoy this!' })
  @IsOptional()
  @IsString()
  message?: string;
}
