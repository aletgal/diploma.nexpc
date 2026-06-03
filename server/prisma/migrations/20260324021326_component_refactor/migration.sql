-- AlterEnum
ALTER TYPE "ComponentCategory" ADD VALUE 'FAN';

-- AlterTable
ALTER TABLE "components" ADD COLUMN     "color" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "specData" JSONB,
ALTER COLUMN "brand" DROP NOT NULL;

-- CreateTable
CREATE TABLE "product_components" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,

    CONSTRAINT "product_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_components_productId_componentId_key" ON "product_components"("productId", "componentId");

-- AddForeignKey
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;
