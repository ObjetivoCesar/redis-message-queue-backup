"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    bufferTime: parseInt(process.env.BUFFER_TIME || '20', 10)
};
exports.config = config;
const redis = new ioredis_1.default(config.url);
exports.redis = redis;
redis.on('error', (error) => {
    console.error('Error en la conexión de Redis:', error);
});
redis.on('connect', () => {
    console.log('Conectado a Redis exitosamente');
});
//# sourceMappingURL=redis.js.map