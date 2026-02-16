import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function toSharingDto(s: {
  id: string;
  itemId: string;
  visibility: string;
  sharedWithEmails: string[];
  allowComments: boolean;
  expiresAt: Date | null;
}) {
  return {
    id: s.id,
    itemId: s.itemId,
    visibility: s.visibility,
    sharedWithEmails: s.sharedWithEmails,
    allowComments: s.allowComments,
    expiresAt: s.expiresAt ? s.expiresAt.toISOString() : undefined,
  };
}

@Injectable()
export class SharingService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwner(ownerId: string, itemId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, ownerId: true },
    });
    if (!item) throw new NotFoundException('Item not found');
    if (item.ownerId !== ownerId) throw new ForbiddenException('Forbidden');
  }

  async get(ownerId: string, itemId: string) {
    await this.assertOwner(ownerId, itemId);
    const settings = await this.prisma.itemSharingSettings.findUnique({
      where: { itemId },
    });
    if (!settings) {
      // default settings if not created yet
      return {
        id: 'default',
        itemId,
        visibility: 'private',
        sharedWithEmails: [],
        allowComments: false,
        expiresAt: undefined,
      };
    }
    return toSharingDto(settings);
  }

  async update(
    ownerId: string,
    input: {
      itemId: string;
      visibility: 'private' | 'friends' | 'public';
      sharedWithEmails?: string[];
      allowComments?: boolean;
      expiresAt?: string;
    },
  ) {
    await this.assertOwner(ownerId, input.itemId);

    const settings = await this.prisma.itemSharingSettings.upsert({
      where: { itemId: input.itemId },
      create: {
        itemId: input.itemId,
        visibility: input.visibility,
        sharedWithEmails: input.sharedWithEmails ?? [],
        allowComments: input.allowComments ?? false,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      },
      update: {
        visibility: input.visibility,
        ...(input.sharedWithEmails
          ? { sharedWithEmails: input.sharedWithEmails }
          : {}),
        ...(typeof input.allowComments === 'boolean'
          ? { allowComments: input.allowComments }
          : {}),
        ...(input.expiresAt !== undefined
          ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
          : {}),
      },
    });

    return toSharingDto(settings);
  }

  async removeAccess(ownerId: string, itemId: string, email: string) {
    await this.assertOwner(ownerId, itemId);

    const existing = await this.prisma.itemSharingSettings.findUnique({
      where: { itemId },
    });
    if (!existing) {
      // Return default settings shape if settings row doesn't exist yet.
      return {
        id: 'default',
        itemId,
        visibility: 'private',
        sharedWithEmails: [],
        allowComments: false,
        expiresAt: undefined,
      };
    }

    const updated = await this.prisma.itemSharingSettings.update({
      where: { itemId },
      data: {
        sharedWithEmails: existing.sharedWithEmails.filter((e) => e !== email),
      },
    });

    return toSharingDto(updated);
  }
}
