ALTER TABLE "inquiries" DROP CONSTRAINT "inquiries_serviceId_fkey";
ALTER TABLE "inquiries" DROP CONSTRAINT "inquiries_packageId_fkey";
ALTER TABLE "inquiries" DROP CONSTRAINT "inquiries_bundleId_fkey";

ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "inquiries_serviceId_idx" ON "inquiries"("serviceId");
CREATE INDEX "inquiries_packageId_idx" ON "inquiries"("packageId");
CREATE INDEX "inquiries_bundleId_idx" ON "inquiries"("bundleId");

CREATE TABLE "catalogue_deletions" (
  "id" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "actorId" TEXT,
  "actorEmail" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "catalogue_deletions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalogue_deletions_resource_recordId_idx" ON "catalogue_deletions"("resource", "recordId");
CREATE INDEX "catalogue_deletions_deletedAt_idx" ON "catalogue_deletions"("deletedAt");
ALTER TABLE "catalogue_deletions" ADD CONSTRAINT "catalogue_deletions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
