# syntax=docker/dockerfile:1

# California School Finder as a self-hosted container.
#
# The image holds the web app only. School data lives in Convex, or in the
# sample data bundled with the app, so there is no database in here and
# nothing to migrate. It serves the sample data unless a Convex address is
# given when the container starts (see "Self-hosting with Docker" in README.md):
#
#   docker build -t school-finder .
#   docker run -p 3000:3000 school-finder                      # sample data
#   docker run -p 3000:3000 \
#     -e CONVEX_URL=https://<deployment>.convex.cloud school-finder    # real data
#
# The build needs network access once: it downloads the font from Google.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
# pnpm at the version pinned in package.json ("packageManager").
RUN corepack enable

# --- Dependencies: reinstalled only when the lockfile changes.
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- Build: a standalone server with only the files it needs to run.
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next.config.ts turns on `output: "standalone"` when this is set, so Vercel
# and local builds are unaffected.
ENV BUILD_STANDALONE=1
RUN pnpm build

# --- Run: no package manager, no source, no dev dependencies.
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO /dev/null "http://127.0.0.1:${PORT}/en" || exit 1
CMD ["node", "server.js"]
