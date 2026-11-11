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

# Production Build erstellen
RUN npm run build

# Nginx für statische Dateien installieren
RUN apk add --no-cache nginx

# Build-Ausgabe nach Nginx-Verzeichnis kopieren
RUN mkdir -p /usr/share/nginx/html && \
    cp -r dist/* /usr/share/nginx/html/

# Nginx-Config für SPA-Routing
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /assets { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/http.d/default.conf

# Port 80 freigeben
EXPOSE 80

# Nginx starten
CMD ["nginx", "-g", "daemon off;"]
