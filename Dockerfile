FROM node:20-alpine

WORKDIR /app

# Install build dependencies for better-sqlite3 (native addon)
RUN apk add --no-cache python3 make g++

# Install all dependencies (including devDependencies for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/
RUN npx tsc

# Remove devDependencies and build tools after compile
RUN npm prune --omit=dev && apk del python3 make g++

# Create data directory
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/ski-stats.db

CMD ["node", "dist/index.js"]
