# Usar Node.js 20 LTS
FROM node:20-alpine

# Crear directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema para Sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Copiar package files
COPY package*.json ./
COPY tsconfig.json ./

# Instalar TODAS las dependencias (incluidas devDependencies para compilar TypeScript)
RUN npm ci && \
    npm cache clean --force

# Copiar código fuente
COPY src ./src

# Compilar TypeScript
RUN npx tsc

# Crear directorios necesarios
RUN mkdir -p logs uploads

# Exponer puerto
EXPOSE 3001

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001

# Comando de inicio
CMD ["node", "dist/server.js"]
