-- AlterTable
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "communes_city_id_name_key" ON "communes"("city_id", "name");

-- CreateIndex (partiel — plusieurs username null OK)
CREATE UNIQUE INDEX "users_username_uq" ON "users"("username") WHERE "username" IS NOT NULL;

-- CreateTable
CREATE TABLE "forbidden_terms" (
    "id" UUID NOT NULL,
    "term" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forbidden_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "forbidden_terms_term_key" ON "forbidden_terms"("term");
