CREATE TYPE "InquiryKind" AS ENUM ('GENERAL', 'SERVICE', 'PACKAGE', 'BUNDLE');
CREATE TYPE "InquirySource" AS ENUM ('CONTACT_PAGE', 'SERVICE_PAGE', 'PRICING_PAGE', 'BUNDLE_PAGE', 'ABOUT_PAGE', 'HOMEPAGE', 'OTHER');
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'QUOTED', 'WON', 'LOST', 'SPAM', 'ARCHIVED');

CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "website" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "interest" TEXT,
    "budget" TEXT,
    "timeline" TEXT,
    "kind" "InquiryKind" NOT NULL DEFAULT 'GENERAL',
    "source" "InquirySource" NOT NULL DEFAULT 'CONTACT_PAGE',
    "sourcePath" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "serviceId" TEXT,
    "packageId" TEXT,
    "bundleId" TEXT,
    "serviceNameSnapshot" TEXT,
    "packageNameSnapshot" TEXT,
    "bundleNameSnapshot" TEXT,
    "packageTierSnapshot" TEXT,
    "packagePriceSnapshot" TEXT,
    "assignedAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inquiry_notes" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inquiry_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inquiries_createdAt_status_idx" ON "inquiries"("createdAt", "status");
CREATE INDEX "inquiries_status_createdAt_idx" ON "inquiries"("status", "createdAt");
CREATE INDEX "inquiries_kind_createdAt_idx" ON "inquiries"("kind", "createdAt");
CREATE INDEX "inquiries_email_idx" ON "inquiries"("email");
CREATE INDEX "inquiry_notes_inquiryId_createdAt_idx" ON "inquiry_notes"("inquiryId", "createdAt");

ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
