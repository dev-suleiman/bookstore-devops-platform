import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'reader@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3curePass!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @MinLength(1)
  name: string;
}
