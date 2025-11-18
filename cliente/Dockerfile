# Usar Node.js 20 LTS
FROM node:20-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install && \
    npm cache clean --force

# Copiar código fuente
COPY public ./public
COPY src ./src
COPY tsconfig.json ./

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
