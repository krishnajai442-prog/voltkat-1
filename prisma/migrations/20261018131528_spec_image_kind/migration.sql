-- CreateEnum
CREATE TYPE "SpecKind" AS ENUM ('SPEC', 'WARRANTY', 'MFG');

-- CreateEnum
CREATE TYPE "ImageKind" AS ENUM ('GALLERY', 'SHOWCASE');

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "kind" "ImageKind" NOT NULL DEFAULT 'GALLERY';

-- AlterTable
ALTER TABLE "ProductSpecification" ADD COLUMN     "kind" "SpecKind" NOT NULL DEFAULT 'SPEC';
