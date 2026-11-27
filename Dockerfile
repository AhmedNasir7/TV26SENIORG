# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies. --ignore-scripts skips the project's postinstall
# (a cosmetic `update-browserslist-db` refresh) which errors under pnpm's
# newer ignored-builds enforcement in a from-scratch container; it isn't
# needed for the app to build or run correctly.
# The cache mount persists pnpm's package store across builds (including
# CI runs, via the GitHub Actions cache backend), so unchanged dependencies
# are reused instead of re-downloaded.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN pnpm prisma generate

# Copy application code
COPY . .

# Build Next.js application. The googleapis types are large enough that
# the type-check phase hits V8's default heap ceiling without this.
#
# Several API routes construct a Prisma client at module load time, and
# Next's build step imports every route to collect its page data — so
# DATABASE_URL (and friends) must be present even though no query actually
# runs at build time. --mount=type=secret makes the .env file available
# only for this one RUN instruction; it is never written into any image
# layer or docker history, unlike a plain COPY .env would be.
#
# Next's own `output: 'standalone'` build step copies .env into
# .next/standalone itself as a convenience for traditional deployments —
# that copy is a real file in the builder stage's filesystem, not part of
# the ephemeral secret mount, so it survives after the RUN instruction
# ends and would otherwise get shipped by the COPY from this stage below.
# Deleting it immediately after build closes that leak.
ENV NODE_OPTIONS=--max-old-space-size=6144
# The only settings a browser bundle needs are fixed at build time. Both are public and optional;
# everything else comes from the server's .env when the container runs.
ARG NEXT_PUBLIC_PUSHER_KEY=
ARG NEXT_PUBLIC_PUSHER_CLUSTER=
ENV NEXT_PUBLIC_PUSHER_KEY=$NEXT_PUBLIC_PUSHER_KEY NEXT_PUBLIC_PUSHER_CLUSTER=$NEXT_PUBLIC_PUSHER_CLUSTER
# The two placeholders only satisfy the start-up checks while pages are collected; the real values are
# supplied when the container runs. `public` may not exist yet, and the runner stage copies it.
RUN mkdir -p public \
    && DATABASE_URL=postgresql://build:build@localhost:5432/build JWT_SECRET=build-time-placeholder-not-a-real-secret pnpm build \
    && rm -f .next/standalone/.env .next/standalone/.env.*

# Small separate image for database migrations and seeding: the app image carries no tooling
FROM node:20-alpine AS tools
WORKDIR /tools
RUN npm install --no-audit --no-fund --no-package-lock prisma@7.4.0 @prisma/client@7.4.0 @prisma/adapter-pg@7.4.0 pg@8 bcryptjs@3 tsx@4 dotenv@16
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY scripts ./scripts
COPY src/lib ./src/lib
COPY --from=builder /app/src/generated ./src/generated
ENV NODE_ENV=production
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# This project uses Prisma's newer "prisma-client" generator, which outputs
# to src/generated/prisma (configured in schema.prisma) instead of the
# default generator's node_modules/.prisma — nothing to copy from there.
COPY --from=builder /app/src/generated ./src/generated

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["node", "server.js"]
