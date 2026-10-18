FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json database.js openapi.yaml ./
COPY migrations ./migrations
COPY public ./public
COPY assets ./assets
RUN mkdir -p uploads && chown node:node uploads

USER node

EXPOSE 4100

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "require('http').get({host:'127.0.0.1',port:process.env.PORT||4100,path:'/healthz'},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]

CMD ["node", "--enable-source-maps", "dist/server.js"]
