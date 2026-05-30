# 🍸 Bartender

Plataforma **SaaS realtime** para bares, restaurantes, gastrobares, pubs y discotecas.
Carta digital por QR, pedidos desde el móvil, comandas en tiempo real para cocina y barra,
sistema de música social (peticiones de canciones de YouTube) y dashboard administrativo.

> Multi‑negocio · multi‑usuario · _ownership_ por negocio. **Sin multi‑tenant complejo.**

---

## ✨ Características

- **Auth completa**: registro, login, refresh token (JWT access + refresh), bcrypt, roles y permisos granulares.
- **Roles**: `OWNER`, `ADMIN`, `WAITER`, `DJ`, `CASHIER`, `KITCHEN`, `BAR` con permisos por defecto + permisos extra/revocados por usuario.
- **Negocios**: el OWNER crea negocios, invita usuarios hijos y asigna roles/permisos.
- **Mesas + QR**: cada mesa genera un QR único (PNG/SVG) que apunta a `/(...)/b/{slug}/table/{mesa}`.
- **Sesiones guest**: al escanear el QR se crea una sesión anónima temporal (Redis, TTL) — sin login.
- **Menú**: categorías (bebidas, comida, postres, promociones) e items con `preparationArea` (KITCHEN / BAR).
- **Pedidos realtime**: el cliente pide desde el móvil; la comanda se separa automáticamente y llega a **cocina**, **barra** y **dashboard** vía Socket.io.
- **KDS y Bar Display**: pantallas dedicadas con tiempos, prioridad por antigüedad y cambio de estado.
- **Música social**: búsqueda en YouTube, cola FIFO con prioridad y votos, moderación (aprobar/rechazar) y reproducción/skip.
- **Analytics**: ventas, productos más vendidos, canciones más pedidas, tiempo medio de preparación, mesas más activas y horas pico.
- **Seguridad**: Helmet, CORS, rate‑limit global, validación de DTOs, anti‑flood de pedidos y anti‑spam de canciones.
- **PWA** instalable (Android/iOS) con caché offline parcial de la carta.

---

## 🏗️ Arquitectura

Monorepo con **backend** (NestJS) y **frontend** (Vue 3). El backend sigue **Clean Architecture +
Arquitectura Hexagonal**: cada módulo separa `domain` / `application` / `infrastructure`.

```
bartender/
├── backend/                # NestJS (Clean / Hexagonal)
│   └── src/
│       ├── core/           # Primitivas de dominio (excepciones, paginación)
│       ├── shared/         # Enums, guards, decoradores, filtros, interceptores, realtime
│       ├── config/         # Configuración tipada y validación de entorno
│       ├── infrastructure/ # Mongoose, Redis, Socket.io, seguridad, seeds
│       └── modules/        # auth, users, business, tables, sessions, menu, orders, music, analytics
├── frontend/               # Vue 3 + Vite + Tailwind + Pinia + PWA
│   └── src/
│       ├── pages/ layouts/ components/
│       ├── stores/ services/ socket/ composables/ shared/
│       └── router/
├── docker-compose.yml
├── .env.example
└── README.md
```

### Estructura de un módulo (ejemplo `orders`)

```
modules/orders/
├── domain/            # entities, value-objects, repositories (puertos), services
├── application/       # use-cases, dto, presenters
└── infrastructure/    # controllers, schemas (Mongoose), mappers, repositories
```

Principios aplicados: **SOLID**, **DDD**, **Repository Pattern**, **Dependency Injection**,
**Use Cases**, validación con DTOs, **Guards / Pipes / Interceptors / Exception Filters**.

---

## 🧱 Stack

**Backend:** NestJS · TypeScript · MongoDB (Mongoose) · Socket.io · JWT · Redis · Docker
**Frontend:** Vue 3 · Vite · TypeScript · Tailwind CSS · Pinia · Vue Router · Axios · Socket.io‑client · PWA

---

## 🚀 Puesta en marcha

### Opción A — Docker (recomendada)

```bash
cp .env.example .env          # ajusta secretos y YOUTUBE_API_KEY
docker compose up -d --build
# Frontend: http://localhost:5173
# API:      http://localhost:3000/api
```

Cargar datos de ejemplo (con los contenedores levantados):

```bash
docker compose exec backend node dist/main.js   # asegúrate de que arrancó
docker compose exec backend npm run seed
```

### Opción B — Local (desarrollo)

Requisitos: Node 20+, MongoDB y Redis en local (o vía Docker sólo esos dos servicios).

```bash
cp .env.example .env

# Backend
cd backend && npm install && npm run start:dev

# Frontend (otra terminal)
cd frontend && npm install && npm run dev

# Seeds (otra terminal, con Mongo arriba)
cd backend && npm run seed
```

### Credenciales de ejemplo (tras el seed)

| Rol    | Email                  | Password       |
| ------ | ---------------------- | -------------- |
| OWNER  | `owner@bartender.app`  | `Password123!` |
| WAITER | `waiter@bartender.app` | `Password123!` |
| KITCHEN| `kitchen@bartender.app`| `Password123!` |
| BAR    | `bar@bartender.app`    | `Password123!` |
| DJ     | `dj@bartender.app`     | `Password123!` |

Negocio demo: **La Esquina** (`slug: la-esquina`). Flujo cliente (QR):
`http://localhost:5173/b/la-esquina/table/mesa-1`

---

## 📡 Realtime (Socket.io)

**Rooms:** `business:{id}` · `kitchen:{businessId}` · `bar:{businessId}` · `table:{tableId}`

**Eventos:** `order.created`, `order.updated`, `kitchen.order.created`, `bar.order.created`,
`music.requested`, `music.approved`, `music.rejected`, `music.playing`, `music.skipped`,
`music.queue.updated`, `table.updated`.

El servidor usa el **adaptador Redis** de Socket.io para escalado horizontal.

---

## 🔌 API (resumen)

| Método | Endpoint                                   | Acceso        |
| ------ | ------------------------------------------ | ------------- |
| POST   | `/api/auth/register` · `/login` · `/refresh` | Público     |
| GET    | `/api/auth/me`                             | JWT           |
| POST   | `/api/businesses` · `GET /businesses/mine` | OWNER         |
| CRUD   | `/api/users`                               | `user:manage` |
| CRUD   | `/api/tables` · `GET /tables/:id/qr.png\|svg` | `table:*`  |
| CRUD   | `/api/menu/categories` · `/menu/items`     | `menu:*`      |
| GET    | `/api/orders` · `/orders/kitchen` · `/orders/bar` | staff  |
| PATCH  | `/api/orders/:id/status`                   | staff         |
| GET    | `/api/music/queue` · POST `/music/play-next` · `/music/skip` | DJ/Admin |
| GET    | `/api/analytics/overview`                  | `analytics:view` |
| POST   | `/api/public/sessions/scan`                | Público (QR)  |
| GET    | `/api/public/menu/:slug`                   | Público       |
| POST   | `/api/public/orders`                       | Público (guest) |
| GET    | `/api/public/music/search` · POST `/public/music/request` | Público |

Todas las respuestas se envuelven en `{ success, data, timestamp }`.

---

## 🔑 Variables de entorno

Ver [`.env.example`](./.env.example). Claves principales:

- `MONGO_URI`, `REDIS_HOST`/`REDIS_PORT`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`
- `CORS_ORIGINS`, `RATE_LIMIT_TTL`, `RATE_LIMIT_MAX`
- `QR_BASE_URL` (base de las URLs de los QR)
- `YOUTUBE_API_KEY` (YouTube Data API v3)
- Frontend: `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_YOUTUBE_API_KEY`

> En producción la app **no arranca** con los secretos JWT por defecto.

---

## 🧪 Calidad y comandos

```bash
# Backend
npm --prefix backend run test        # unit
npm --prefix backend run test:e2e    # e2e básico
npm --prefix backend run lint

# Frontend
npm --prefix frontend run build      # type-check + build
npm --prefix frontend run lint

# Raíz
npm run docker:up                    # levanta todo
npm run seed                         # datos de ejemplo
```

ESLint + Prettier en ambos proyectos · Husky + lint‑staged a nivel raíz
(`git init && npm install` para activar los hooks).

---

## 📦 Colecciones MongoDB

`users` · `businesses` · `tables` · `menu_categories` · `menu_items` · `orders`
· `music_requests`. Las sesiones guest viven en **Redis** (TTL).

---

## 🗺️ Roadmap sugerido

- Suscripciones / billing (Stripe) sobre `subscriptionStatus`.
- Sub‑estados por área (cocina vs barra) en un mismo pedido.
- Spotify playback además de YouTube.
- Notificaciones push (PWA) y métricas avanzadas.

---

Hecho con NestJS + Vue 3. Licencia MIT.
