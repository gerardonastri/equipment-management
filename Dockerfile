# Fase 1: Build
FROM node:20-alpine AS builder

# Aggiungiamo libc6-compat: è fondamentale per Next.js su Alpine Linux 
# per far funzionare correttamente il compilatore SWC e l'ottimizzazione immagini
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copia i file delle dipendenze
COPY package*.json ./

# Installiamo le dipendenze
RUN npm install

# Copia il resto del codice sorgente
COPY . .

# Disabilita la telemetria di Next.js durante la build (velocizza il processo)
ENV NEXT_TELEMETRY_DISABLED=1

# Lancia il tuo script ("next build --webpack")
# NOTA: next-pwa genererà qui i file sw.js e workbox nella cartella /public
RUN npm run build


# Fase 2: Run
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Sicurezza: creiamo un utente non-root. Far girare i container come root è sconsigliato.
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiamo la cartella public generata nella build (FONDAMENTALE per next-pwa)
COPY --from=builder /app/public ./public

# Copiamo la build standalone e i file statici, assegnando la proprietà all'utente nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Passiamo all'utente non-root
USER nextjs

# Esposizione porta
EXPOSE 3000

# Variabili d'ambiente richieste per il corretto avvio del server standalone
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Avviamo il server standalone
CMD ["node", "server.js"]