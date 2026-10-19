import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisPubClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 500, 3000),
  },
});

export const redisSubClient = redisPubClient.duplicate();

redisPubClient.on('error', (err) => console.error('[Redis PUB Error]:', err.message));
redisSubClient.on('error', (err) => console.error('[Redis SUB Error]:', err.message));

export async function initRedis(): Promise<boolean> {
  try {
    await redisPubClient.connect();
    await redisSubClient.connect();
    console.log(`[Redis] ✅ Conectado ao Redis em ${REDIS_URL}`);
    return true;
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(
      `[Redis] ⚠️ Não foi possível conectar ao Redis (${error.message}). Continuando sem cluster Pub/Sub.`
    );
    return false;
  }
}
