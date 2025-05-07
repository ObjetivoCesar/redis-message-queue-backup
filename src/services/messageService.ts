import { redis, config } from '../config/redis';
import { ChatMessage } from '../types';
import axios from 'axios';

export class MessageService {
  static async processMessage(message: ChatMessage): Promise<{ status: number; response?: any }> {
    const key = `chat:${message.chatId}`;
    
    try {
      const exists = await redis.exists(key);
      
      if (!exists) {
        // Primer mensaje - crear cola
        await redis.lpush(key, JSON.stringify(message));
        await redis.expire(key, config.bufferTime);
        return { status: 202 }; // Accepted
      }
      
      // Segundo o posterior mensaje - procesar lote
      const messages = await redis.lrange(key, 0, -1);
      await redis.del(key);
      
      // Convertir mensajes almacenados a objetos
      const storedMessages = messages.map(m => JSON.parse(m));
      const allMessages = [...storedMessages, message];
      
      // Enviar lote al webhook destino
      if (process.env.WEBHOOK_DEST_URL) {
        await axios.post(process.env.WEBHOOK_DEST_URL, { messages: allMessages });
      }
      
      return {
        status: 200,
        response: {
          success: true,
          messages: allMessages
        }
      };
      
    } catch (error) {
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