FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
COPY openapi.yaml ./
EXPOSE 3000
CMD ["node", "src/index.js"]
