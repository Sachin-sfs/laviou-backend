import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConciergeServiceType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateConciergeDto {
  @ApiProperty({ example: 'item-id' })
  @IsString()
  @MinLength(1)
  itemId!: string;

  @ApiProperty({
    enum: ConciergeServiceType,
    example: ConciergeServiceType.appraisal,
  })
  @IsEnum(ConciergeServiceType)
  serviceType!: ConciergeServiceType;

  @ApiPropertyOptional({ example: 'Please help with appraisal.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
