import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateBookDto {
  @ApiProperty({ example: 'The Pragmatic Programmer' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ example: 'David Thomas & Andrew Hunt' })
  @IsString()
  @MinLength(1)
  author: string;

  @ApiPropertyOptional({ example: 'A classic guide to software craftsmanship.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 34.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  stock: number;
}
