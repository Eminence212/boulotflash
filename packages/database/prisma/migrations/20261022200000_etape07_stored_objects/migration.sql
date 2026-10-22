-- CreateEnum
CREATE TYPE "StoredObjectKind" AS ENUM ('MEDIA', 'PRIVATE');

-- CreateTable
CREATE TABLE "stored_objects" (
    "id" UUID NOT NULL,
    "kind" "StoredObjectKind" NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "byte_size" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_objects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stored_objects_bucket_key_key" ON "stored_objects"("bucket", "key");
