# ============================================
# SMS Backend - Dockerfile
# ============================================

# Basis-Image: Node.js 18 auf Alpine Linux (klein & sicher)
FROM node:22-alpine

# OpenSSL 3 installieren (für Prisma auf Alpine)
RUN apk add --no-cache openssl

# Arbeitsverzeichnis im Container
WORKDIR /app

# Step 1: Dependencies installieren
# Nur package*.json kopieren für besseres Caching
COPY package*.json ./
COPY prisma ./prisma/

# npm ci installiert exakt wie in package-lock.json
RUN npm ci

# Step 2: Source Code kopieren
# Kopiert ALLE Dateien aus dem context-Verzeichnis
COPY . .

# Step 3: Prisma Client generieren
RUN npm run prisma:generate

# Port 5000 freigeben
EXPOSE 5000

# Dev Server starten (mit Live-Reload)
CMD ["npm", "run", "dev"]
