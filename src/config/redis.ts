import Redis from 'ioredis';
import dotenv from 'dotenv';
import { RedisConfig } from '../types';

dotenv.config();

const config: RedisConfig = {
  url: process.env.REDIS_URL || '',
  bufferTime: parseInt(process.env.BUFFER_TIME || '20', 10)
};

const redis = new Redis(config.url);

redis.on('error', (error) => {
  console.error('Error en la conexión de Redis:', error);
});

redis.on('connect', () => {
  console.log('Conectado a Redis exitosamente');
});

export { redis, config }; 