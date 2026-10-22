#!/bin/sh
set -eu

echo "Waiting for MinIO..."
i=0
until mc alias set local http://s3:9000 "$S3_ACCESS_KEY" "$S3_SECRET_KEY" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "MinIO not ready"
    exit 1
  fi
  sleep 1
done

mc mb --ignore-existing "local/${S3_BUCKET_MEDIA}"
mc mb --ignore-existing "local/${S3_BUCKET_PRIVATE}"

# Accès anonyme interdit (les deux buckets) — chiffrement au repos via MINIO_KMS_SECRET_KEY
mc anonymous set none "local/${S3_BUCKET_MEDIA}" || true
mc anonymous set none "local/${S3_BUCKET_PRIVATE}" || true

echo "Buckets ready: ${S3_BUCKET_MEDIA}, ${S3_BUCKET_PRIVATE}"
