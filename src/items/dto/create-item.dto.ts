import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateItemDto {
  @ApiProperty({ example: 'Vintage watch' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'A watch passed down from my grandfather.' })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
