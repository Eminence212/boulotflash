FROM node:24.22.0-bookworm AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/worker/package.json apps/worker/
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/worker apps/worker
RUN pnpm --filter @boulotflash/contracts build \
 && test -f packages/contracts/dist/index.d.ts \
 && pnpm --filter @boulotflash/worker build

FROM node:24.22.0-bookworm AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/worker
EXPOSE 3002
CMD ["node", "dist/main.js"]
