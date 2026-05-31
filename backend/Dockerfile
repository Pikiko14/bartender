# Contexto de build: carpeta backend/ (docker compose y Railway con Root Directory = backend)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY . .
RUN npm run build:backend

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
