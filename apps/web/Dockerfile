FROM node:24.22.0-bookworm AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY tsconfig.base.json ./
COPY design/tokens design/tokens
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN pnpm --filter @boulotflash/contracts build \
 && pnpm --filter @boulotflash/web build

FROM node:24.22.0-bookworm AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
