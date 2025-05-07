import { NextApiRequest, NextApiResponse } from 'next';
import { redis } from '../../lib/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { user_id, message } = req.body;

    if (!user_id || !message) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Almacenar el mensaje en Redis con una clave única
    const messageKey = `message:${user_id}:${Date.now()}`;
    await redis.set(messageKey, JSON.stringify({
      user_id,
      message,
      timestamp: Date.now()
    }));

    // Configurar el tiempo de expiración (por ejemplo, 5 minutos)
    await redis.expire(messageKey, 300);

    // Responder al widget
    return res.status(200).json({ 
      message: "Mensaje recibido y almacenado correctamente",
      status: "success"
    });

  } catch (error) {
    console.error('Error al procesar el mensaje:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
} 