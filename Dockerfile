# Fase 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Usiamo il tuo script di build specifico
RUN npm run build

# Fase 2: Run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copiamo solo il necessario dalla fase build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]