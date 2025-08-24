FROM node:18-slim
WORKDIR /app
COPY . /app
RUN npm install && npm run build
CMD ["npm", "run", "dev"]
