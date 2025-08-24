FROM node:18
WORKDIR /app
COPY package.json tsconfig.json vite.config.ts .
COPY src src
COPY index.html .
RUN npm install && npm run build
CMD ["npm","run","dev"]
