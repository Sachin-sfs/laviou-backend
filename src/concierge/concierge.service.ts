import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ConciergeRequest, ConciergeServiceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function toDto(r: ConciergeRequest) {
  return {
    id: r.id,
    itemId: r.itemId,
    serviceType: r.serviceType,
    status: r.status,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

@Injectable()
export class ConciergeService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwner(ownerId: string, itemId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      select: { ownerId: true },
    });
    if (!item) throw new NotFoundException('Item not found');
    if (item.ownerId !== ownerId) throw new ForbiddenException('Forbidden');
  }

  async list(ownerId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;

    const where = {
      item: { ownerId },
    } as const;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.conciergeRequest.count({ where }),
      this.prisma.conciergeRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { total, rows: rows.map(toDto) };
  }

  async get(ownerId: string, id: string) {
    const row = await this.prisma.conciergeRequest.findUnique({
      where: { id },
      include: { item: { select: { ownerId: true } } },
    });
    if (!row) throw new NotFoundException('Concierge request not found');
    if (row.item.ownerId !== ownerId) throw new ForbiddenException('Forbidden');
    return toDto(row);
  }

  async create(
    ownerId: string,
    input: {
      itemId: string;
      serviceType: ConciergeServiceType;
      notes?: string;
    },
  ) {
    await this.assertOwner(ownerId, input.itemId);
    const row = await this.prisma.conciergeRequest.create({
      data: {
        itemId: input.itemId,
        serviceType: input.serviceType,
        notes: input.notes,
      },
    });
    return toDto(row);
  }

  async cancel(ownerId: string, id: string) {
    const row = await this.prisma.conciergeRequest.findUnique({
      where: { id },
      include: { item: { select: { ownerId: true } } },
    });
    if (!row) throw new NotFoundException('Concierge request not found');
    if (row.item.ownerId !== ownerId) throw new ForbiddenException('Forbidden');

    const updated = await this.prisma.conciergeRequest.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    return toDto(updated);
  }
}
