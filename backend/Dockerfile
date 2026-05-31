# Contexto de build:
# - docker compose: context=. + PACKAGE_DIR=backend (ver docker-compose.yml)
# - Railway (raíz del repo): context=. + PACKAGE_DIR=backend (ver railway.toml)
# - Railway (root directory=backend): context=backend/ + PACKAGE_DIR=. (default)
ARG PACKAGE_DIR=.

# ---- Build stage ----
FROM node:22-alpine AS build
ARG PACKAGE_DIR
WORKDIR /app
COPY ${PACKAGE_DIR}/package.json ${PACKAGE_DIR}/package-lock.json ./
RUN npm ci
COPY ${PACKAGE_DIR}/ .
RUN npm run build

# ---- Production stage ----
FROM node:22-alpine AS production
ARG PACKAGE_DIR
ENV NODE_ENV=production
WORKDIR /app
COPY ${PACKAGE_DIR}/package.json ${PACKAGE_DIR}/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
