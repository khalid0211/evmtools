FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS backend-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
COPY --from=backend-deps /app/server/node_modules ./server/node_modules
COPY server ./server
COPY --from=frontend-build /app/dist ./server/dist
EXPOSE 3000
CMD ["node", "server/index.js"]
