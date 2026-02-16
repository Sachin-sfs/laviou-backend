import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class DonateItemDto {
  @ApiProperty({ example: 'item-id' })
  @IsString()
  @MinLength(1)
  itemId!: string;

  @ApiProperty({ example: 'org-123' })
  @IsString()
  @MinLength(1)
  organizationId!: string;

  @ApiPropertyOptional({ example: 'Drop off next week.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
