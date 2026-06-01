import mongoose from 'mongoose';
import { Logger } from '@nestjs/common';

/** Añade campos Spotify / musicProvider si faltan (idempotente). */
export async function runSpotifySupportMigration(logger: Logger): Promise<void> {
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/bartender';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('Sin conexión a MongoDB');

  try {
    const businesses = db.collection('businesses');
    const resultBiz = await businesses.updateMany(
      { musicProvider: { $exists: false } },
      {
        $set: {
          musicProvider: 'YOUTUBE',
          spotifyUserId: null,
          spotifyDisplayName: null,
          spotifyAccessToken: null,
          spotifyRefreshToken: null,
          spotifyTokenExpiresAt: null,
          spotifyDeviceId: null,
          spotifyConnectedAt: null,
          spotifyLastSyncAt: null,
        },
      },
    );

    const musicRequests = db.collection('music_requests');
    const resultMusic = await musicRequests.updateMany(
      { provider: { $exists: false } },
      {
        $set: {
          provider: 'YOUTUBE',
          spotifyId: null,
          artist: null,
          album: null,
        },
      },
    );

    if (resultBiz.modifiedCount > 0 || resultMusic.modifiedCount > 0) {
      logger.log(
        `[migrate] spotify-support: ${resultBiz.modifiedCount} negocios, ${resultMusic.modifiedCount} peticiones actualizadas`,
      );
    } else {
      logger.log('[migrate] spotify-support: sin cambios (ya aplicada)');
    }
  } finally {
    await mongoose.disconnect();
  }
}
