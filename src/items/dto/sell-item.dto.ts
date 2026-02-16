import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, MinLength } from 'class-validator';

export class SellItemDto {
  @ApiProperty({ example: 'item-id' })
  @IsString()
  @MinLength(1)
  itemId!: string;

  @ApiProperty({ example: 250 })
  @IsNumber()
  price!: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @MinLength(1)
  currency!: string;
}
