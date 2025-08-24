FROM node:18
WORKDIR /app
COPY package.json tsconfig.json jest.config.js .
COPY src src
RUN npm install && npm run build
CMD ["node","dist/index.js"]
