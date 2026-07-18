import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class AddItemDto {
  @ApiProperty({ description: 'ID of the book to add to the cart' })
  @IsString()
  bookId: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
