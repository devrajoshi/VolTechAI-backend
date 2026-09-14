CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'EDITOR');

CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'EDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "seedKey" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "company" TEXT,
    "quote" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "imagePath" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "seedKey" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
CREATE UNIQUE INDEX "admin_sessions_tokenHash_key" ON "admin_sessions"("tokenHash");
CREATE INDEX "admin_sessions_userId_idx" ON "admin_sessions"("userId");
CREATE INDEX "admin_sessions_expiresAt_idx" ON "admin_sessions"("expiresAt");
CREATE UNIQUE INDEX "testimonials_seedKey_key" ON "testimonials"("seedKey");
CREATE INDEX "testimonials_isPublished_sortOrder_idx" ON "testimonials"("isPublished", "sortOrder");
CREATE UNIQUE INDEX "faqs_seedKey_key" ON "faqs"("seedKey");
CREATE INDEX "faqs_isPublished_sortOrder_idx" ON "faqs"("isPublished", "sortOrder");

ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
