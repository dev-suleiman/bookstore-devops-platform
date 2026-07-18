import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.getCart(user.userId);
  }

  @Post('items')
  addItem(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddItemDto) {
    return this.cartService.addItem(user.userId, dto);
  }

  @Patch('items/:bookId')
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookId') bookId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(user.userId, bookId, dto);
  }

  @Delete('items/:bookId')
  removeItem(@CurrentUser() user: AuthenticatedUser, @Param('bookId') bookId: string) {
    return this.cartService.removeItem(user.userId, bookId);
  }

  @Delete()
  clearCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.clearCart(user.userId);
  }
}
