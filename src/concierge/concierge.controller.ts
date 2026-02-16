import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ok, paginate } from '../common/api';
import { ApiJwtAuth } from '../common/swagger';
import { CreateConciergeDto } from './dto/create-concierge.dto';
import { ConciergeService } from './concierge.service';

@ApiTags('concierge')
@Controller('concierge')
@UseGuards(JwtAuthGuard)
@ApiJwtAuth()
export class ConciergeController {
  constructor(private readonly concierge: ConciergeService) {}

  @Get()
  @ApiOperation({ summary: 'List concierge requests (paginated)' })
  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            id: 'req-id',
            itemId: 'item-id',
            serviceType: 'appraisal',
            status: 'pending',
            notes: 'Please help with appraisal.',
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

    const res = await this.concierge.list(ownerId, page, pageSize);
    return paginate({ data: res.rows, total: res.total, page, pageSize });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get concierge request by id' })
  async getById(@Req() req: Request, @Param('id') id: string) {
    const ownerId = req.user?.userId;
    if (!ownerId) throw new UnauthorizedException();
    const row = await this.concierge.get(ownerId, id);
    return ok(row, 'OK');
  }

  @Post()
  @ApiOperation({ summary: 'Create concierge request' })
  async create(@Req() req: Request, @Body() body: CreateConciergeDto) {
    const ownerId = req.user?.userId;
    if (!ownerId) throw new UnauthorizedException();
    const row = await this.concierge.create(ownerId, body);
    return ok(row, 'Created');
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel concierge request' })
  async cancel(@Req() req: Request, @Param('id') id: string) {
    const ownerId = req.user?.userId;
    if (!ownerId) throw new UnauthorizedException();
    const row = await this.concierge.cancel(ownerId, id);
    return ok(row, 'Updated');
  }
}
