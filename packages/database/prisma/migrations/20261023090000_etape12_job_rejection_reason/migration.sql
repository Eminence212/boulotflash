-- Motif de rejet visible par le recruteur (étape 12).
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
