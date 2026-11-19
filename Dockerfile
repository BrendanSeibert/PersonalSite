# Production image: one container serving the built frontend and the API on one port.
# Development still uses backend/Dockerfile and frontend/Dockerfile through docker-compose.yml.

# ---- 1. Build the frontend ----------------------------------------------------
FROM node:24-alpine AS frontend
WORKDIR /build
COPY frontend/package*.json ./
# No install scripts: none of the packages the build needs has one (only dev tools: esbuild, fsevents, @parcel/watcher).
RUN npm ci --ignore-scripts
COPY frontend/ ./
# tsc -b && vite build -> /build/dist
RUN npm run build

# ---- 2. Build the backend -----------------------------------------------------
FROM node:24-alpine AS backend
WORKDIR /build
COPY backend/package*.json ./
# No install scripts: none of the packages the build needs has one (only dev tools: esbuild, fsevents, @parcel/watcher).
RUN npm ci --ignore-scripts
COPY backend/ ./
# tsc -> /build/dist; then drop dev packages
RUN npm run build && npm prune --omit=dev

# ---- 3. Runtime: nothing but what runs ----------------------------------------
FROM node:24-alpine
ENV NODE_ENV=production \
    STATIC_DIR=/app/public
WORKDIR /app
COPY --from=backend  --chown=node:node /build/package.json ./
COPY --from=backend  --chown=node:node /build/node_modules ./node_modules
COPY --from=backend  --chown=node:node /build/dist         ./dist
COPY --from=backend  --chown=node:node /build/migrations   ./migrations
COPY --from=frontend --chown=node:node /build/dist         ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1
CMD ["node", "dist/server.js"]
