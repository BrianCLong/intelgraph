FROM node:18-slim
WORKDIR /app
COPY . /app
RUN npm install && npm run build
CMD ["node", "dist/index.js"]
