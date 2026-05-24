# syntax=docker/dockerfile:1
# Production image: multi-stage build that ships only Next.js' standalone output
# (a minimal server.js + traced node_modules) — no dev tooling, no source.

# ---- deps: install all dependencies (dev deps are needed to build) ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: produce the standalone server ----
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner: minimal runtime ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Bind to all interfaces on 3000 so the published port is reachable.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Run as an unprivileged user.
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# The standalone bundle (server.js + minimal node_modules + package.json)...
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# ...plus static assets, which the standalone server serves from .next/static.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
