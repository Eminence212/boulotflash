-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INCOMPLETE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "UserRoleType" AS ENUM ('WORKER', 'EMPLOYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdminScope" AS ENUM ('SUPPORT', 'MODERATOR', 'FINANCE', 'SUPER');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('google', 'facebook', 'instagram');

-- CreateEnum
CREATE TYPE "EmployerType" AS ENUM ('INDIVIDUAL', 'BUSINESS', 'ARTISAN', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "StructureCheckStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'FILLED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('CDF', 'USD');

-- CreateEnum
CREATE TYPE "PayUnit" AS ENUM ('HOUR', 'DAY', 'MISSION');

-- CreateEnum
CREATE TYPE "PayChannel" AS ENUM ('CASH', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'SHORTLISTED', 'OFFERED', 'ACCEPTED', 'REJECTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SelectionOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "DeclarationOutcome" AS ENUM ('COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('JOB_POST', 'FEATURED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MPESA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'AFRIMONEY', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'REJECTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RightSource" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "RightType" AS ENUM ('POST', 'FEATURED');

-- CreateEnum
CREATE TYPE "RightStatus" AS ENUM ('AVAILABLE', 'USED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('JOB', 'USER', 'PARTICIPATION', 'SELECTION');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('MONEY_REQUEST', 'FAKE_OFFER', 'HARASSMENT', 'DANGER', 'NO_SHOW', 'PAY_DISPUTE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'PHONE_CHANGE', 'MISSION_PHONE');

-- CreateEnum
CREATE TYPE "PhoneChangeStatus" AS ENUM ('PENDING_OLD', 'PENDING_NEW', 'PENDING_SUPPORT', 'DONE', 'REJECTED');

-- CreateEnum
CREATE TYPE "ClosedIdentifierKind" AS ENUM ('PHONE', 'EMAIL', 'GOOGLE_SUB');

-- CreateEnum
CREATE TYPE "TermsKind" AS ENUM ('TERMS', 'PRIVACY');

-- CreateEnum
CREATE TYPE "AvailabilitySlot" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "CommercialPriceType" AS ENUM ('POST', 'FEATURED');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ExportRequestStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "display_name" VARCHAR(80),
    "avatar_url" TEXT,
    "phone_confirmed_at" TIMESTAMPTZ(6),
    "age_confirmed_at" TIMESTAMPTZ(6),
    "active_mode" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "UserRoleType" NOT NULL,
    "admin_scope" "AdminScope",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by" UUID,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_totp_secrets" (
    "user_id" UUID NOT NULL,
    "secret_encrypted" TEXT NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_totp_secrets_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "recovery_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "consumed_at" TIMESTAMPTZ(6),
    "purpose" "OtpPurpose" NOT NULL,
    "last_sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_send_logs" (
    "id" UUID NOT NULL,
    "phone_masked" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "cost_estimate_cdf" INTEGER,
    "purpose" "OtpPurpose" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_send_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "closed_identifiers" (
    "id" UUID NOT NULL,
    "kind" "ClosedIdentifierKind" NOT NULL,
    "value_hash" TEXT NOT NULL,
    "closed_at" TIMESTAMPTZ(6) NOT NULL,
    "reusable_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "closed_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_changes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "old_phone" TEXT,
    "new_phone" TEXT NOT NULL,
    "status" "PhoneChangeStatus" NOT NULL,
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "phone_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communes" (
    "id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "communes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "sensitive_if_home" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "main_category_id" UUID,
    "commune_id" UUID,
    "experience_note" TEXT,
    "profile_photo_key" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "terms_accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "worker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_skills" (
    "worker_profile_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "worker_skills_pkey" PRIMARY KEY ("worker_profile_id","category_id")
);

-- CreateTable
CREATE TABLE "worker_availability" (
    "id" UUID NOT NULL,
    "worker_profile_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "slot" "AvailabilitySlot" NOT NULL,

    CONSTRAINT "worker_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employer_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "EmployerType" NOT NULL,
    "display_name" TEXT NOT NULL,
    "contact_person" TEXT,
    "commune_id" UUID,
    "address_private" TEXT,
    "mission_phone" TEXT,
    "presentation" TEXT,
    "phone_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "structure_check_status" "StructureCheckStatus" NOT NULL DEFAULT 'NONE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "employer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "employer_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "commune_id" UUID NOT NULL,
    "public_landmark" TEXT,
    "public_latitude" DOUBLE PRECISION,
    "public_longitude" DOUBLE PRECISION,
    "address_private" TEXT,
    "private_latitude" DOUBLE PRECISION,
    "private_longitude" DOUBLE PRECISION,
    "mission_phone" TEXT,
    "at_private_home" BOOLEAN NOT NULL DEFAULT false,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "duration_hours" DOUBLE PRECISION NOT NULL,
    "workers_needed" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "pay_unit" "PayUnit" NOT NULL,
    "pay_channel" "PayChannel" NOT NULL,
    "pay_timing" TEXT,
    "skills_required" TEXT,
    "material_conditions" TEXT,
    "transport_support" BOOLEAN NOT NULL DEFAULT false,
    "meals_support" BOOLEAN NOT NULL DEFAULT false,
    "equipment_support" BOOLEAN NOT NULL DEFAULT false,
    "apply_deadline" TIMESTAMPTZ(6) NOT NULL,
    "selection_deadline" TIMESTAMPTZ(6) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_until" TIMESTAMPTZ(6),
    "current_version_id" UUID,
    "published_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_versions" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "job_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "message" TEXT,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selection_offers" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "job_version_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "SelectionOfferStatus" NOT NULL DEFAULT 'PENDING',
    "reserved_slot" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "selection_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participations" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "selection_offer_id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "employer_id" UUID NOT NULL,
    "job_version_id" UUID NOT NULL,
    "status" "ParticipationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "dispute_flag" BOOLEAN NOT NULL DEFAULT false,
    "worker_outcome" "DeclarationOutcome",
    "employer_outcome" "DeclarationOutcome",
    "worker_declared_at" TIMESTAMPTZ(6),
    "employer_declared_at" TIMESTAMPTZ(6),
    "employer_payment_declared_at" TIMESTAMPTZ(6),
    "worker_payment_confirmed_at" TIMESTAMPTZ(6),
    "contact_revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_feedback" (
    "id" UUID NOT NULL,
    "participation_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_profile_alerts" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_profile_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "services_payants" BOOLEAN NOT NULL DEFAULT false,
    "dispute_window_hours" INTEGER NOT NULL DEFAULT 48,
    "reminder_hours_before" INTEGER NOT NULL DEFAULT 3,
    "proposal_min_hours" INTEGER NOT NULL DEFAULT 2,
    "applications_per_rolling_day" INTEGER NOT NULL DEFAULT 5,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "employer_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ(6),
    "suspended_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_prices" (
    "id" UUID NOT NULL,
    "type" "CommercialPriceType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "duration_hours" INTEGER,
    "refund_terms" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "commercial_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "job_id" UUID,
    "purpose" "PaymentPurpose" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider_reference" TEXT,
    "evidence_key" TEXT,
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMPTZ(6),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_reviews" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "reference_seen" TEXT,
    "amount_seen" INTEGER,
    "received" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_rights" (
    "id" UUID NOT NULL,
    "employer_id" UUID NOT NULL,
    "payment_id" UUID,
    "source" "RightSource" NOT NULL,
    "type" "RightType" NOT NULL,
    "job_id" UUID,
    "status" "RightStatus" NOT NULL DEFAULT 'AVAILABLE',
    "valid_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMPTZ(6),

    CONSTRAINT "publication_rights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "template_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "related_type" TEXT,
    "related_id" UUID,
    "dedupe_key" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_type" "ReportTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "handled_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "structure_checks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_key" TEXT NOT NULL,
    "status" "StructureCheckStatus" NOT NULL DEFAULT 'PENDING',
    "reviewer_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "structure_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_documents" (
    "id" UUID NOT NULL,
    "kind" "TermsKind" NOT NULL,
    "version" TEXT NOT NULL,
    "body_md" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_acceptances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "terms_document_id" UUID NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_access_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "participation_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_code" INTEGER NOT NULL,
    "response_body" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_export_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "ExportRequestStatus" NOT NULL DEFAULT 'PENDING',
    "file_key" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_export_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_appeals" (
    "id" UUID NOT NULL,
    "report_id" UUID,
    "user_id" UUID,
    "body" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'OPEN',
    "handler_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),

    CONSTRAINT "report_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "recovery_codes_user_id_idx" ON "recovery_codes"("user_id");

-- CreateIndex
CREATE INDEX "otp_challenges_phone_purpose_idx" ON "otp_challenges"("phone", "purpose");

-- CreateIndex
CREATE INDEX "closed_identifiers_kind_value_hash_idx" ON "closed_identifiers"("kind", "value_hash");

-- CreateIndex
CREATE INDEX "phone_changes_user_id_idx" ON "phone_changes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "worker_profiles_user_id_key" ON "worker_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "worker_availability_worker_profile_id_weekday_slot_key" ON "worker_availability"("worker_profile_id", "weekday", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "employer_profiles_user_id_key" ON "employer_profiles"("user_id");

-- CreateIndex
CREATE INDEX "jobs_employer_id_created_at_idx" ON "jobs"("employer_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "job_versions_job_id_version_number_key" ON "job_versions"("job_id", "version_number");

-- CreateIndex
CREATE INDEX "applications_worker_id_applied_at_idx" ON "applications"("worker_id", "applied_at" DESC);

-- CreateIndex
CREATE INDEX "applications_job_id_idx" ON "applications"("job_id");

-- CreateIndex
CREATE INDEX "selection_offers_application_id_idx" ON "selection_offers"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "participations_application_id_key" ON "participations"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "participations_selection_offer_id_key" ON "participations"("selection_offer_id");

-- CreateIndex
CREATE INDEX "participations_worker_id_idx" ON "participations"("worker_id");

-- CreateIndex
CREATE INDEX "participations_employer_id_idx" ON "participations"("employer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_employer_id_key" ON "subscriptions"("employer_id");

-- CreateIndex
CREATE INDEX "publication_rights_employer_id_status_idx" ON "publication_rights"("employer_id", "status");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "terms_documents_kind_version_key" ON "terms_documents"("kind", "version");

-- CreateIndex
CREATE UNIQUE INDEX "terms_acceptances_user_id_terms_document_id_key" ON "terms_acceptances"("user_id", "terms_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_user_id_key_key" ON "idempotency_keys"("user_id", "key");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_totp_secrets" ADD CONSTRAINT "admin_totp_secrets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_changes" ADD CONSTRAINT "phone_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communes" ADD CONSTRAINT "communes_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_main_category_id_fkey" FOREIGN KEY ("main_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_commune_id_fkey" FOREIGN KEY ("commune_id") REFERENCES "communes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_skills" ADD CONSTRAINT "worker_skills_worker_profile_id_fkey" FOREIGN KEY ("worker_profile_id") REFERENCES "worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_skills" ADD CONSTRAINT "worker_skills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_availability" ADD CONSTRAINT "worker_availability_worker_profile_id_fkey" FOREIGN KEY ("worker_profile_id") REFERENCES "worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_profiles" ADD CONSTRAINT "employer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_profiles" ADD CONSTRAINT "employer_profiles_commune_id_fkey" FOREIGN KEY ("commune_id") REFERENCES "communes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_commune_id_fkey" FOREIGN KEY ("commune_id") REFERENCES "communes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_versions" ADD CONSTRAINT "job_versions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selection_offers" ADD CONSTRAINT "selection_offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selection_offers" ADD CONSTRAINT "selection_offers_job_version_id_fkey" FOREIGN KEY ("job_version_id") REFERENCES "job_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations" ADD CONSTRAINT "participations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations" ADD CONSTRAINT "participations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations" ADD CONSTRAINT "participations_selection_offer_id_fkey" FOREIGN KEY ("selection_offer_id") REFERENCES "selection_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations" ADD CONSTRAINT "participations_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations" ADD CONSTRAINT "participations_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations" ADD CONSTRAINT "participations_job_version_id_fkey" FOREIGN KEY ("job_version_id") REFERENCES "job_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_feedback" ADD CONSTRAINT "private_feedback_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_feedback" ADD CONSTRAINT "private_feedback_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_profile_alerts" ADD CONSTRAINT "job_profile_alerts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_profile_alerts" ADD CONSTRAINT "job_profile_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reviews" ADD CONSTRAINT "payment_reviews_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reviews" ADD CONSTRAINT "payment_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_rights" ADD CONSTRAINT "publication_rights_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_rights" ADD CONSTRAINT "publication_rights_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_rights" ADD CONSTRAINT "publication_rights_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "structure_checks" ADD CONSTRAINT "structure_checks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_terms_document_id_fkey" FOREIGN KEY ("terms_document_id") REFERENCES "terms_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_access_logs" ADD CONSTRAINT "contact_access_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_access_logs" ADD CONSTRAINT "contact_access_logs_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_export_requests" ADD CONSTRAINT "data_export_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_appeals" ADD CONSTRAINT "report_appeals_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_appeals" ADD CONSTRAINT "report_appeals_handler_id_fkey" FOREIGN KEY ("handler_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ——— Contraintes / index partiels (modele-donnees.md, étape 05) ———
CREATE UNIQUE INDEX users_phone_uq ON users (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX users_email_uq ON users (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX auth_identities_provider_uq ON auth_identities (provider, provider_user_id);
CREATE UNIQUE INDEX applications_pair_uq ON applications (job_id, worker_id);
CREATE UNIQUE INDEX rights_payment_uq ON publication_rights (payment_id) WHERE payment_id IS NOT NULL;
CREATE UNIQUE INDEX alerts_pair_uq ON job_profile_alerts (job_id, user_id);

CREATE UNIQUE INDEX notifications_dedupe_uq ON notifications (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE INDEX jobs_published_lookup_idx ON jobs (commune_id, category_id, published_at DESC) WHERE status = 'PUBLISHED';
CREATE INDEX selection_offers_pending_idx ON selection_offers (status, expires_at) WHERE status = 'PENDING';
CREATE INDEX notifications_unread_in_app_idx ON notifications (user_id, created_at DESC) WHERE channel = 'IN_APP' AND read_at IS NULL;
CREATE INDEX payments_review_queue_idx ON payments (status) WHERE status IN ('PENDING', 'UNDER_REVIEW');
CREATE INDEX publication_rights_available_idx ON publication_rights (employer_id, status) WHERE status = 'AVAILABLE';
