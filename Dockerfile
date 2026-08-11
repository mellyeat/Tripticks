FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run css:build && npm prune --omit=dev

# El logger escribe en logs/, asi que la carpeta debe pertenecer al usuario node.
RUN mkdir -p logs && chown -R node:node /app
USER node

ENV NODE_ENV=production PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
