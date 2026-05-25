FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ---

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy prisma client and schema for migrate deploy
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Install prisma CLI in runner stage (needed for migrate deploy)
RUN npm install -g prisma

EXPOSE 3000

# Run migrations then start — prisma migrate deploy is non-interactive (safe for Docker)
CMD ["sh", "-c", "prisma migrate deploy && node server.js"]
