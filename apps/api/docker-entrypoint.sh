#!/bin/sh
set -e
pnpm --dir /app --filter @boulotflash/database prisma migrate deploy
exec "$@"
