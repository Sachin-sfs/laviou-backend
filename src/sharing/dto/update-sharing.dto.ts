import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const visibilities = ['private', 'friends', 'public'] as const;

export class UpdateSharingDto {
  @ApiProperty({ example: 'item-id' })
  @IsString()
  @MinLength(1)
  itemId!: string;

  @ApiProperty({ enum: visibilities, example: 'private' })
  @IsIn(visibilities)
  visibility!: (typeof visibilities)[number];

  @ApiPropertyOptional({ example: ['friend@example.com'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sharedWithEmails?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
