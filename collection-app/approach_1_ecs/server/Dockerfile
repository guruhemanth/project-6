# ==============================================================================
# STAGE 1: Dependency Builder
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install production-only dependencies cleanly
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ==============================================================================
# STAGE 2: Hardened Minimal Production Runtime
# ==============================================================================
FROM node:22-alpine

WORKDIR /app

# 1. Patch OS security packages (resolves Alpine/OpenSSL CVEs)
RUN apk update && apk upgrade --no-cache

# 2. Remove npm, npx, yarn, and corepack from production runtime image
#    (Eliminates 100% of bundled npm tool vulnerabilities & reduces attack surface)
RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/bin/npm \
           /usr/local/bin/npx \
           /opt/yarn* \
           /usr/local/bin/yarn* \
           /usr/local/bin/corepack

# 3. Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# 4. Copy application source code and manifests
COPY src/ ./src/
COPY package.json ./

# 5. Run as non-root user
USER node

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "src/server.js"]
