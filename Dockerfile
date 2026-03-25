FROM node:22-alpine AS deps

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY --from=deps --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --chown=node:node backend ./backend
COPY --chown=node:node frontend ./frontend
COPY --chown=node:node scripts ./scripts

USER node
WORKDIR /app/backend

EXPOSE 3000

CMD ["npm", "start"]
