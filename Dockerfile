FROM node:18-alpine

WORKDIR /app

# Copiar package.json do backend
COPY backend/package*.json ./backend/

# Instalar dependências
WORKDIR /app/backend
RUN npm install --production

# Copiar código do backend e frontend
WORKDIR /app
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Expor porta
EXPOSE 3001

# Comando para iniciar
WORKDIR /app/backend
CMD ["node", "server.js"]
