-- Recette étape 05 — unicités critiques (modele-donnees.md).
-- Succès = chaque DO vérifie unique_violation ; échec si un doublon passe.
-- Usage : psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/check-constraints.sql

BEGIN;

CREATE TEMP TABLE _bf05 (
  job_id uuid,
  worker_id uuid,
  employer_id uuid,
  payment_id uuid
);

DO $$
DECLARE
  v_city uuid := gen_random_uuid();
  v_commune uuid := gen_random_uuid();
  v_category uuid := gen_random_uuid();
  v_employer uuid := gen_random_uuid();
  v_worker uuid := gen_random_uuid();
  v_job uuid := gen_random_uuid();
  v_payment uuid := gen_random_uuid();
  v_app1 uuid := gen_random_uuid();
  v_app2 uuid := gen_random_uuid();
  v_right1 uuid := gen_random_uuid();
  v_right2 uuid := gen_random_uuid();
  v_free uuid := gen_random_uuid();
  v_u1 uuid := gen_random_uuid();
  v_u2 uuid := gen_random_uuid();
  v_u3 uuid := gen_random_uuid();
  v_u4 uuid := gen_random_uuid();
BEGIN
  INSERT INTO cities (id, name, is_active) VALUES (v_city, 'Kinshasa-recette-05', false);
  INSERT INTO communes (id, city_id, name, is_active)
  VALUES (v_commune, v_city, 'Gombe-recette-05', false);
  INSERT INTO categories (id, slug, name, family, is_sensitive, sensitive_if_home, is_active, sort_order)
  VALUES (v_category, 'recette-05-' || substr(v_category::text, 1, 8), 'Recette 05', 'test', false, false, true, 0);

  INSERT INTO users (id, status, locale, created_at, updated_at)
  VALUES
    (v_employer, 'INCOMPLETE', 'fr', now(), now()),
    (v_worker, 'INCOMPLETE', 'fr', now(), now());

  INSERT INTO jobs (
    id, employer_id, title, description, category_id, commune_id,
    start_at, duration_hours, workers_needed, amount, currency, pay_unit, pay_channel,
    apply_deadline, selection_deadline, status, is_featured, at_private_home,
    transport_support, meals_support, equipment_support, created_at, updated_at
  ) VALUES (
    v_job, v_employer, 'Job recette 05', 'desc', v_category, v_commune,
    now() + interval '2 days', 4, 1, 10000, 'CDF', 'DAY', 'CASH',
    now() + interval '1 day', now() + interval '1 day', 'DRAFT', false, false,
    false, false, false, now(), now()
  );

  INSERT INTO applications (id, job_id, worker_id, status, applied_at, updated_at)
  VALUES (v_app1, v_job, v_worker, 'SUBMITTED', now(), now());

  BEGIN
    INSERT INTO applications (id, job_id, worker_id, status, applied_at, updated_at)
    VALUES (v_app2, v_job, v_worker, 'SUBMITTED', now(), now());
    RAISE EXCEPTION 'applications_pair_uq: doublon accepté (attendu unique_violation)';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'OK applications_pair_uq';
  END;

  INSERT INTO payments (
    id, user_id, purpose, amount, currency, method, status, created_at
  ) VALUES (
    v_payment, v_employer, 'JOB_POST', 5000, 'CDF', 'MANUAL', 'CONFIRMED', now()
  );

  INSERT INTO publication_rights (
    id, employer_id, payment_id, source, type, status, created_at
  ) VALUES (
    v_right1, v_employer, v_payment, 'PAID', 'POST', 'AVAILABLE', now()
  );

  BEGIN
    INSERT INTO publication_rights (
      id, employer_id, payment_id, source, type, status, created_at
    ) VALUES (
      v_right2, v_employer, v_payment, 'PAID', 'POST', 'AVAILABLE', now()
    );
    RAISE EXCEPTION 'rights_payment_uq: doublon accepté (attendu unique_violation)';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'OK rights_payment_uq';
  END;

  INSERT INTO publication_rights (
    id, employer_id, payment_id, source, type, status, created_at
  ) VALUES (
    v_free, v_employer, NULL, 'FREE', 'POST', 'AVAILABLE', now()
  );
  RAISE NOTICE 'OK publication_rights FREE sans payment_id';

  INSERT INTO users (id, phone, status, locale, created_at, updated_at)
  VALUES (v_u1, '+243810000005', 'INCOMPLETE', 'fr', now(), now());

  BEGIN
    INSERT INTO users (id, phone, status, locale, created_at, updated_at)
    VALUES (v_u2, '+243810000005', 'INCOMPLETE', 'fr', now(), now());
    RAISE EXCEPTION 'users_phone_uq: doublon accepté (attendu unique_violation)';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'OK users_phone_uq';
  END;

  INSERT INTO users (id, phone, status, locale, created_at, updated_at)
  VALUES
    (v_u3, NULL, 'INCOMPLETE', 'fr', now(), now()),
    (v_u4, NULL, 'INCOMPLETE', 'fr', now(), now());
  RAISE NOTICE 'OK users phone NULL multiples';

  INSERT INTO _bf05 (job_id, worker_id, employer_id, payment_id)
  VALUES (v_job, v_worker, v_employer, v_payment);
END $$;

ROLLBACK;

SELECT 'check-constraints.sql OK' AS result;
