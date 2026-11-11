# ============================================
# SMS Frontend - Dockerfile
# ============================================

# Basis-Image: Node.js 18 auf Alpine Linux
FROM node:22-alpine

# Arbeitsverzeichnis im Container
WORKDIR /app

# Step 1: Dependencies installieren
COPY package*.json ./

RUN npm ci

# Step 2: Source Code kopieren
COPY . .

# Port 3000 freigeben (Vite Dev Server)
EXPOSE 3000

# Vite Dev Server starten
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
