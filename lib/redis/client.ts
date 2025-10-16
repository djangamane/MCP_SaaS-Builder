import { Redis } from '@upstash/redis';

let redisClient: Redis | null | undefined;

let hasLoggedConfig = false;

function resolveRedisConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_URL ||
    process.env.REDIS_HOST;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REDIS_TOKEN ||
    process.env.REDIS_SECRET;

  if (!url || !token) {
    if (!hasLoggedConfig) {
      console.warn('[Redis] No Redis configuration found; falling back to in-memory store.');
      hasLoggedConfig = true;
    }
    return null;
  }

  if (!hasLoggedConfig) {
    console.info('[Redis] Redis configuration detected. Enabling persistence.');
    hasLoggedConfig = true;
  }

  return { url, token };
}

export function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const config = resolveRedisConfig();
  if (!config) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({
    url: config.url,
    token: config.token,
  });

  return redisClient;
}

export function isRedisEnabled(): boolean {
  return getRedisClient() !== null;
}
