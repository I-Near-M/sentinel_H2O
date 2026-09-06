# =========================================================================
# Multi-stage build para Sentinel-H2O Frontend Web App (Bun + Nginx Alpine)
# =========================================================================

# Stage 1: Build
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copiar manifiestos e instalar dependencias
COPY package.json ./
RUN bun install

# Copiar código fuente y compilar bundle de producción
COPY . .
RUN bun run build

# Stage 2: Producción ligera con Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
