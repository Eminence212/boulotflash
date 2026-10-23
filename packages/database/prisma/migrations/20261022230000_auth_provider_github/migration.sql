-- Remplace Instagram par GitHub (idempotent).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AuthProvider' AND e.enumlabel = 'instagram'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AuthProvider' AND e.enumlabel = 'github'
  ) THEN
    ALTER TYPE "AuthProvider" RENAME VALUE 'instagram' TO 'github';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AuthProvider' AND e.enumlabel = 'github'
  ) THEN
    ALTER TYPE "AuthProvider" ADD VALUE 'github';
  END IF;
END $$;
