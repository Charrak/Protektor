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

# Port 5173 freigeben (Vite Dev Server)
EXPOSE 5173

# Vite Dev Server starten
# Wichtig: --host 0.0.0.0 damit Container von außen erreichbar ist
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
