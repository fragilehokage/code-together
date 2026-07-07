# ── Stage 1: Build React client ────────────────────────────────────────────────
FROM node:20-alpine AS client-build

WORKDIR /app/client

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ── Stage 2: Production server ─────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=4050

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/ ./
COPY --from=client-build /app/client/dist /app/client/dist

EXPOSE 4050

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4050/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
