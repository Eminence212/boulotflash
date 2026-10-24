-- Étape 16 : propositions, réservation, concurrence.

-- Une seule proposition en attente par candidature. Les propositions terminées restent en historique.
-- Dernière ligne de défense contre deux POST /applications/{id}/offer simultanés sur la même candidature.
CREATE UNIQUE INDEX "selection_offers_one_pending_per_application"
  ON "selection_offers"("application_id")
  WHERE "status" = 'PENDING';

-- Balayage des expirations (worker et POST /test/run-expirations).
CREATE INDEX "selection_offers_status_expires_at_idx" ON "selection_offers"("status", "expires_at");

-- Notifications in-app sans doublon lors des rejeux (worker, balayage, double clic).
-- dedupe_key NULL reste autorisé plusieurs fois (sémantique NULL de Postgres).
CREATE UNIQUE INDEX "notifications_user_id_dedupe_key_key" ON "notifications"("user_id", "dedupe_key");
