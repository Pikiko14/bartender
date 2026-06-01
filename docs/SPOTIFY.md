# Spotify en Bartender

Integración de Spotify como proveedor musical alternativo a YouTube. La cola, votos y moderación siguen en Bartender; Spotify solo ejecuta la reproducción.

## Variables de entorno

```env
SPOTIFY_CLIENT_ID=tu_client_id
SPOTIFY_CLIENT_SECRET=tu_client_secret
SPOTIFY_REDIRECT_URI=https://tu-api.com/api/spotify/callback
PUBLIC_APP_URL=https://tu-frontend.com
```

En local:

```env
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
PUBLIC_APP_URL=http://localhost:5173
```

## Spotify Developer Dashboard

1. Crear app en [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. **Redirect URI**: debe coincidir exactamente con `SPOTIFY_REDIRECT_URI`.
   - Ejemplo prod: `https://bartender-production.up.railway.app/api/spotify/callback`
3. Habilitar **Web Playback SDK** en la app.
4. La cuenta conectada debe ser **Spotify Premium**.

## Migración de base de datos

```bash
cd backend
npm run migrate:spotify
```

Añade a negocios existentes `musicProvider: YOUTUBE` y campos Spotify en `null`.

## Flujo OAuth

```
Admin → GET /api/spotify/connect
     → Redirect Spotify authorize
     → GET /api/spotify/callback?code=&state=
     → Guarda tokens por negocio
     → Redirect frontend /app/spotify?connected=1
```

Estado OAuth firmado con HMAC (JWT secret). Tokens guardados por establecimiento:

- `spotifyUserId`
- `spotifyAccessToken` / `spotifyRefreshToken` / `spotifyTokenExpiresAt`

Renovación automática antes de expiración y reintento ante HTTP 401.

## Flujo de reproducción

```
Cliente pide canción → cola Bartender (PENDING → APPROVED)
Staff inicia/skip → PlaybackUseCase.playNext()
                 → SpotifyPlaybackBridge.play(spotifyId)
                 → PUT /v1/me/player/play?device_id=...
```

**No se usa la cola interna de Spotify.**

## Activar el reproductor

1. Admin: **Música → Spotify → Conectar Spotify**
2. Elegir proveedor **Spotify**
3. Abrir **`/spotify-player`** (auth staff) o **`/b/:slug/spotify-player`** (tablet pública)
4. El SDK crea un device y envía `deviceId` al backend
5. Verificar en admin: **Device activo** ≠ vacío

Si no hay device:

> No hay un reproductor Spotify activo.

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/spotify/connect` | URL OAuth |
| GET | `/api/spotify/callback` | Callback OAuth |
| GET | `/api/spotify/status` | Estado conexión |
| DELETE | `/api/spotify/disconnect` | Desconectar |
| POST | `/api/spotify/device` | Registrar deviceId |
| GET | `/api/spotify/player-token` | Token para Web Playback SDK |
| GET | `/api/spotify/search?q=` | Búsqueda (staff) |
| GET | `/api/public/spotify/:slug/search` | Búsqueda (cliente QR) |
| POST | `/api/public/spotify/request` | Pedir canción Spotify |

## Modelo de pista

```json
{
  "id": "spotifyTrackId",
  "title": "...",
  "artist": "...",
  "album": "...",
  "duration": 210,
  "imageUrl": "https://...",
  "provider": "SPOTIFY"
}
```

En `music_requests`: `provider`, `spotifyId`, `artist`, `album` (YouTube sin cambios).

## Errores controlados

- OAuth inválido / denegado
- Token expirado (refresh + retry)
- Device inexistente / desconectado (reconexión automática en `/spotify-player`)
- Sin Premium (403)
- Permisos insuficientes

Logs en backend con prefijo `[Spotify]`.
