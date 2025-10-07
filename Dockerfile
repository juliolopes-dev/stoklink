FROM node:18-alpine

WORKDIR /app

# Copiar package.json do backend
COPY backend/package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar código do backend e frontend
COPY backend/ ./
COPY frontend/ ./frontend/

# Expor porta
EXPOSE 3001

# Comando para iniciar
CMD ["node", "server.js"]
