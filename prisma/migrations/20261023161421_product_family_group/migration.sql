-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE INDEX "Product_groupId_idx" ON "Product"("groupId");
