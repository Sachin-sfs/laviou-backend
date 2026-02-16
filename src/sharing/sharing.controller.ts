import {
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ok } from '../common/api';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ApiJwtAuth } from '../common/swagger';
import { UpdateSharingDto } from './dto/update-sharing.dto';
import { SharingService } from './sharing.service';

@ApiTags('sharing')
@Controller('items/:itemId/sharing')
@UseGuards(JwtAuthGuard)
@ApiJwtAuth()
export class SharingController {
  constructor(private readonly sharing: SharingService) {}

  @Get()
  @ApiOperation({ summary: 'Get sharing settings for an item' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'OK',
        data: {
          id: 'settings-id',
          itemId: 'item-id',
          visibility: 'private',
          sharedWithEmails: ['friend@example.com'],
          allowComments: false,
          expiresAt: '2026-12-31T00:00:00.000Z',
        },
      },
    },
  })
  async get(@Req() req: Request, @Param('itemId') itemId: string) {
    const ownerId = req.user?.userId;
    if (!ownerId) throw new UnauthorizedException();
    const settings = await this.sharing.get(ownerId, itemId);
    return ok(settings, 'OK');
  }

  @Put()
  @ApiOperation({ summary: 'Update sharing settings for an item' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'Updated',
        data: {
          id: 'settings-id',
          itemId: 'item-id',
          visibility: 'friends',
          sharedWithEmails: ['friend@example.com'],
          allowComments: true,
          expiresAt: undefined,
        },
      },
    },
  })
  async update(
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Body() body: UpdateSharingDto,
  ) {
    const ownerId = req.user?.userId;
    if (!ownerId) throw new UnauthorizedException();
    const settings = await this.sharing.update(ownerId, { ...body, itemId });
    return ok(settings, 'Updated');
  }

  @Delete(':email')
  @ApiOperation({ summary: 'Remove a specific email from sharedWith' })
  async remove(
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Param('email') email: string,
  ) {
    const ownerId = req.user?.userId;
    if (!ownerId) throw new UnauthorizedException();
    const settings = await this.sharing.removeAccess(ownerId, itemId, email);
    return ok(settings, 'Removed');
  }
}
