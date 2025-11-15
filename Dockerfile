# Etapa 1: Build
FROM node:20-alpine AS builder

# Información del mantenedor
LABEL maintainer="tu-email@ejemplo.com"
LABEL description="Eventia Core API - Event Management System"

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias (incluyendo dev dependencies para el build)
RUN npm ci

# Copiar código fuente
COPY src/ ./src/

# Compilar TypeScript
RUN npm run build

# Etapa 2: Production
FROM node:20-alpine

# Crear usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copiar solo package.json y package-lock.json
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copiar código compilado desde builder
COPY --from=builder /app/dist ./dist

# Cambiar ownership de los archivos
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "dist/index.js"]
