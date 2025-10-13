# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY src ./src
COPY lib ./lib

# Build static files
RUN npm run build

# ---------- Serve stage ----------
FROM caddy:2-alpine

# Copy built static files from builder
COPY --from=build /app/dist /usr/share/caddy

# Optional: custom Caddyfile for local debugging
# COPY Caddyfile /etc/caddy/Caddyfile

# Expose default port
EXPOSE 80

