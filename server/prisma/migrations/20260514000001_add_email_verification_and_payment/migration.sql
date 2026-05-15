-- AlterTable: add email verification fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verificationTokenExpiry" TIMESTAMP(3);

-- AlterTable: add payment fields to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentIntentId" TEXT;
