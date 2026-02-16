import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ok, paginate } from '../common/api';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ApiJwtAuth } from '../common/swagger';
import { CreateItemDto } from './dto/create-item.dto';
import { DonateItemDto } from './dto/donate-item.dto';
import { GiftItemDto } from './dto/gift-item.dto';
import { SellItemDto } from './dto/sell-item.dto';
import { ItemsService } from './items.service';

@ApiTags('items')
@Controller('items')
@UseGuards(JwtAuthGuard)
@ApiJwtAuth()
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Get()
  @ApiOperation({ summary: 'List items (paginated)' })
  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            id: 'item-id',
            name: 'Vintage watch',
            description: 'A watch passed down from my grandfather.',
            status: 'active',
            imageUrl: 'https://example.com/image.jpg',
            createdAt: '2026-02-16T00:00:00.000Z',
            updatedAt: '2026-02-16T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    },
  })
  async getAll(
    @Req() req: Request,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    const ownerId = req.user?.userId;
    if (!ownerId) throw new UnauthorizedException();
    const page = Math.max(1, Number(pageRaw ?? 1));
    const pageSize = Math.max(1, Math.min(100, Number(pageSizeRaw ?? 20)));

    const res = await this.items.list(ownerId, page, pageSize);
    return paginate({ data: res.items, total: res.total, page, pageSize });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item by id' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'OK',
        data: {
          id: 'item-id',
          name: 'Vintage watch',
          description: 'A watch passed down from my grandfather.',
          status: 'active',
          imageUrl: 'https://example.com/image.jpg',
          createdAt: '2026-02-16T00:00:00.000Z',
          updatedAt: '2026-02-16T00:00:00.000Z',
        },
      },
    },
  })
  async getById(@Req() req: Request, @Param('id') id: string) {
    const ownerId = req.user?.userId;
    if (!ownerId) throw new UnauthorizedException();
    const item = await this.items.get(ownerId, id);
    return ok(item, 'OK');
  }

  @Post()
  @ApiOperation({ summary: 'Create item' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'Created',
        data: {
          id: 'item-id',
          name: 'Vintage watch',
          description: 'A watch passed down from my grandfather.',
          status: 'active',
          imageUrl: 'https://example.com/image.jpg',
          createdAt: '2026-02-16T00:00:00.000Z',
          updatedAt: '2026-02-16T00:00:00.000Z',
        },
      },
    },
  })
  async create(@Req() req: Request, @Body() body: CreateItemDto) {
    const ownerId = req.user?.userId;
    if (!ownerId) throw new UnauthorizedException();
    const item = await this.items.create(ownerId, body);
    return ok(item, 'Created');
  }

  @Post(':itemId/sell')
  async sell(
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Body() body: SellItemDto,
  ) {
    const ownerId = req.user?.userId;
    if (!ownerId) throw new UnauthorizedException();
    const item = await this.items.sell(ownerId, { ...body, itemId });
    return ok(item, 'Updated');
  }

  @Post(':itemId/gift')
  async gift(
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Body() body: GiftItemDto,
  ) {
    const ownerId = req.user?.userId;
    if (!ownerId) throw new UnauthorizedException();
    const item = await this.items.gift(ownerId, { ...body, itemId });
    return ok(item, 'Updated');
  }

  @Post(':itemId/donate')
  async donate(
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Body() body: DonateItemDto,
  ) {
    const ownerId = req.user?.userId;
    if (!ownerId) throw new UnauthorizedException();
    const item = await this.items.donate(ownerId, { ...body, itemId });
    return ok(item, 'Updated');
  }

  @Delete(':id')
  async delete(@Req() req: Request, @Param('id') id: string) {
    const ownerId = req.user?.userId;
    if (!ownerId) throw new UnauthorizedException();
    const res = await this.items.delete(ownerId, id);
    return ok(res, 'Deleted');
  }
}
