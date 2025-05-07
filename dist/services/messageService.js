"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const redis_1 = require("../config/redis");
const axios_1 = __importDefault(require("axios"));
class MessageService {
    static async processMessage(message) {
        const key = `chat:${message.chatId}`;
        try {
            const exists = await redis_1.redis.exists(key);
            if (!exists) {
                // Primer mensaje - crear cola
                await redis_1.redis.lpush(key, JSON.stringify(message));
                await redis_1.redis.expire(key, redis_1.config.bufferTime);
                return { status: 202 }; // Accepted
            }
            // Segundo o posterior mensaje - procesar lote
            const messages = await redis_1.redis.lrange(key, 0, -1);
            await redis_1.redis.del(key);
            // Convertir mensajes almacenados a objetos
            const storedMessages = messages.map(m => JSON.parse(m));
            const allMessages = [...storedMessages, message];
            // Enviar lote al webhook destino
            if (process.env.WEBHOOK_DEST_URL) {
                await axios_1.default.post(process.env.WEBHOOK_DEST_URL, { messages: allMessages });
            }
            return {
                status: 200,
                response: {
                    success: true,
                    messages: allMessages
                }
            };
        }
        catch (error) {
            console.error('Error procesando mensaje:', error);
            return {
                status: 500,
                response: {
                    success: false,
                    error: 'Error interno del servidor'
                }
            };
        }
    }
}
exports.MessageService = MessageService;
//# sourceMappingURL=messageService.js.map