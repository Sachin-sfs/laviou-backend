-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('active', 'sold', 'gifted', 'donated', 'archived');

-- CreateEnum
CREATE TYPE "SharingVisibility" AS ENUM ('private', 'friends', 'public');

-- CreateEnum
CREATE TYPE "ConciergeRequestStatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ConciergeServiceType" AS ENUM ('appraisal', 'authentication', 'restoration', 'storage', 'shipping');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'active',
    "imageUrl" TEXT,
    "soldPrice" DOUBLE PRECISION,
    "soldCurrency" TEXT,
    "giftedRecipientEmail" TEXT,
    "giftedMessage" TEXT,
    "donatedOrganizationId" TEXT,
    "donatedNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_sharing_settings" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "visibility" "SharingVisibility" NOT NULL DEFAULT 'private',
    "sharedWithEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowComments" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_sharing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concierge_requests" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "serviceType" "ConciergeServiceType" NOT NULL,
    "status" "ConciergeRequestStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concierge_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "items_ownerId_idx" ON "items"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "item_sharing_settings_itemId_key" ON "item_sharing_settings"("itemId");

-- CreateIndex
CREATE INDEX "concierge_requests_itemId_idx" ON "concierge_requests"("itemId");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_sharing_settings" ADD CONSTRAINT "item_sharing_settings_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concierge_requests" ADD CONSTRAINT "concierge_requests_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
