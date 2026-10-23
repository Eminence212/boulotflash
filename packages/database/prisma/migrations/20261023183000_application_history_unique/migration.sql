-- Étape 15 : une seule candidature par personne et par mission, pour toute l’histoire.
ALTER TABLE "applications" ADD COLUMN "amount" INTEGER;
ALTER TABLE "applications" ADD COLUMN "currency" "Currency";
ALTER TABLE "applications" ADD COLUMN "pay_unit" "PayUnit";
ALTER TABLE "applications" ADD COLUMN "commune_name" TEXT;

CREATE UNIQUE INDEX "applications_job_id_worker_id_key" ON "applications"("job_id", "worker_id");
