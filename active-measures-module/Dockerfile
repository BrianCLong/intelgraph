FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json .
RUN npm ci --production
COPY . .
FROM base AS ai-deps
RUN apk add python3 py3-pip && pip install torch networkx sympy # Bundled for airgap
FROM base
COPY --from=ai-deps /usr/lib/python3 /usr/lib/python3
EXPOSE 4000
CMD ["node", "src/index.js"]