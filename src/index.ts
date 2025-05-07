import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { MessageService } from './services/messageService';
import { ChatMessage } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Endpoint principal (sin autenticación por ahora)
app.post('/webhook', async (req, res) => {
  try {
    const { chatId, message } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere chatId y message'
      });
    }

    const messageData: ChatMessage = {
      chatId,
      message,
      timestamp: Date.now()
    };

    const { status, response } = await MessageService.processMessage(messageData);
    return res.status(status).json(response);

  } catch (error) {
    console.error('Error en webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
}); 