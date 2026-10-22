FROM node:24.22.0-bookworm AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/database/package.json packages/database/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY packages/database packages/database
COPY apps/api apps/api
RUN pnpm --filter @boulotflash/contracts build \
 && DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm --filter @boulotflash/database prisma:generate \
 && pnpm --filter @boulotflash/database build \
 && test -f packages/contracts/dist/index.d.ts \
 && test -f packages/database/dist/index.d.ts \
 && pnpm --filter @boulotflash/api build

FROM node:24.22.0-bookworm AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
COPY --from=build /app /app
COPY apps/api/docker-entrypoint.sh /app/apps/api/docker-entrypoint.sh
RUN chmod +x /app/apps/api/docker-entrypoint.sh
WORKDIR /app/apps/api
EXPOSE 3001
# migrate deploy puis seed référentiel (main.ts) puis Nest
ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
