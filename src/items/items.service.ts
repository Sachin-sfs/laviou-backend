import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Item } from '@prisma/client';

function toItemDto(item: Item) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    status: item.status,
    imageUrl: item.imageUrl ?? undefined,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [total, items] = await this.prisma.$transaction([
      this.prisma.item.count({ where: { ownerId } }),
      this.prisma.item.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);
    return { total, items: items.map(toItemDto) };
  }

  async get(ownerId: string, id: string) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    if (item.ownerId !== ownerId) throw new ForbiddenException('Forbidden');
    return toItemDto(item);
  }

  async create(
    ownerId: string,
    input: { name: string; description: string; imageUrl?: string },
  ) {
    const item = await this.prisma.item.create({
      data: {
        ownerId,
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
      },
    });
    return toItemDto(item);
  }

  async delete(ownerId: string, id: string) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    if (item.ownerId !== ownerId) throw new ForbiddenException('Forbidden');
    await this.prisma.item.delete({ where: { id } });
    return true as const;
  }

  async sell(
    ownerId: string,
    input: { itemId: string; price: number; currency: string },
  ) {
    const item = await this.prisma.item.findUnique({
      where: { id: input.itemId },
    });
    if (!item) throw new NotFoundException('Item not found');
    if (item.ownerId !== ownerId) throw new ForbiddenException('Forbidden');

    const updated = await this.prisma.item.update({
      where: { id: input.itemId },
      data: {
        status: 'sold',
        soldPrice: input.price,
        soldCurrency: input.currency,
      },
    });
    return toItemDto(updated);
  }

  async gift(
    ownerId: string,
    input: { itemId: string; recipientEmail: string; message?: string },
  ) {
    const item = await this.prisma.item.findUnique({
      where: { id: input.itemId },
    });
    if (!item) throw new NotFoundException('Item not found');
    if (item.ownerId !== ownerId) throw new ForbiddenException('Forbidden');

    const updated = await this.prisma.item.update({
      where: { id: input.itemId },
      data: {
        status: 'gifted',
        giftedRecipientEmail: input.recipientEmail,
        giftedMessage: input.message,
      },
    });
    return toItemDto(updated);
  }

  async donate(
    ownerId: string,
    input: { itemId: string; organizationId: string; notes?: string },
  ) {
    const item = await this.prisma.item.findUnique({
      where: { id: input.itemId },
    });
    if (!item) throw new NotFoundException('Item not found');
    if (item.ownerId !== ownerId) throw new ForbiddenException('Forbidden');

    const updated = await this.prisma.item.update({
      where: { id: input.itemId },
      data: {
        status: 'donated',
        donatedOrganizationId: input.organizationId,
        donatedNotes: input.notes,
      },
    });
    return toItemDto(updated);
  }
}
