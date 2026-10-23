-- Compteur des ouvertures de la page de détail public.
ALTER TABLE "jobs" ADD COLUMN "detail_view_count" INTEGER NOT NULL DEFAULT 0;
