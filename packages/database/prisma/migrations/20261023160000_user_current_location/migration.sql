-- Position actuelle acceptée par l'utilisateur. Une seule valeur, pas d'historique.
ALTER TABLE "users" ADD COLUMN "location_latitude" DOUBLE PRECISION,
ADD COLUMN "location_longitude" DOUBLE PRECISION,
ADD COLUMN "location_consent_at" TIMESTAMPTZ(6),
ADD COLUMN "location_updated_at" TIMESTAMPTZ(6);
