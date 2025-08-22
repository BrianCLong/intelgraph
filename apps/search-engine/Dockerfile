FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

RUN addgroup -g 1001 -S nodejs
RUN adduser -S searchengine -u 1001

RUN mkdir -p logs && chown -R searchengine:nodejs logs

USER searchengine

EXPOSE 4006

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4006/health || exit 1

CMD ["npm", "start"]