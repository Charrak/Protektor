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
COPY . .

# Step 3: Prisma Client generieren
RUN npm run prisma:generate

# Build the server in the image so a successful image build also verifies TypeScript.
RUN npm run build

# Port 5000 freigeben
EXPOSE 5000

# Run the compiled production server.
CMD ["node", "dist/index.js"]
