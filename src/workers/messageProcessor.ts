import { redis } from '../lib/redis';
import fetch from 'node-fetch';

const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/vy46yk4a2c202wnyyma2n78v4id4hb2h';

async function processMessages() {
  try {
    // Obtener todas las claves de mensajes
    const keys = await redis.keys('message:*');
    
    for (const key of keys) {
      const messageData = await redis.get(key);
      
      if (messageData) {
        const message = JSON.parse(messageData);
        
        try {
          const response = await fetch(MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: message.user_id,
              message: message.message
            })
          });

          const makeResponse = await response.text();
          if (response.ok) {
            // Si el envío fue exitoso, eliminar el mensaje de Redis
            await redis.del(key);
            console.log(`Mensaje enviado exitosamente a Make.com: ${key}`);
            console.log(`Respuesta de Make.com: ${makeResponse}`);
          } else {
            console.error(`Error al enviar mensaje a Make.com: ${key}`);
            console.error(`Respuesta de Make.com: ${makeResponse}`);
          }
        } catch (error) {
          console.error(`Error en la comunicación con Make.com: ${error}`);
        }
      }
    }
  } catch (error) {
    console.error('Error al procesar mensajes:', error);
  }
}

// Ejecutar el procesamiento cada minuto
setInterval(processMessages, 60000);

// Ejecutar inmediatamente al iniciar
processMessages(); 