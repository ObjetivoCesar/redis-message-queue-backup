console.log('=== INICIANDO SERVER.JS ===', __filename, new Date().toISOString());
const express = require('express');
const Redis = require('ioredis');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

// Crear la aplicación Express
const app = express();
let server = null;

// Configuración de Redis
const redis = new Redis();

// Cargar configuración de chatbots
const chatbotsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'chatbots.json'), 'utf8'));

// Configuración de Multer para manejo de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // límite de 10MB
    },
    fileFilter: function (req, file, cb) {
        // Permitir solo imágenes y audio
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen y audio'));
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/Widget', express.static('Widget'));

// Ruta para recibir mensajes
app.post('/api/messages', upload.single('file'), async (req, res) => {
    try {
        const { user_id, message, timestamp, chatbot_id } = req.body;
        
        // Validaciones básicas
        if (!user_id || !chatbot_id) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren user_id y chatbot_id'
            });
        }

        // Verificar si el chatbot existe
        if (!chatbotsConfig[chatbot_id]) {
            return res.status(400).json({
                success: false,
                error: 'Chatbot no encontrado'
            });
        }

        console.log('DEBUG req.file:', req.file);
        console.log('DEBUG req.body:', req.body);
        
        // Crear una clave única para el mensaje
        const messageKey = `message:${chatbot_id}:${user_id}:${Date.now()}`;
        const userChatbotKey = `${user_id}:${chatbot_id}`;
        
        // Verificar si es el primer mensaje para este usuario/chatbot
        const firstMessageTime = await redis.get(`first_message_time:${userChatbotKey}`);
        const isFirstMessage = !firstMessageTime;
        
        // Si es el primer mensaje, guardar el tiempo
        if (isFirstMessage) {
            await redis.setex(`first_message_time:${userChatbotKey}`, 300, Date.now().toString());
            console.log(`⏱️ Primer mensaje para ${userChatbotKey}, iniciando contador de 20 segundos`);
        }
        
        // Preparar el mensaje
        const messageData = {
            user_id,
            chatbot_id,
            message: message || '',
            timestamp: timestamp || new Date().toISOString(),
            first_message_time: isFirstMessage ? Date.now() : parseInt(firstMessageTime)
        };

        if (req.file) {
            messageData.file = {
                filename: req.file.filename,
                path: req.file.path,
                mimetype: req.file.mimetype,
                size: req.file.size
            };
        }
        
        // Almacenar el mensaje en Redis
        await redis.setex(messageKey, 300, JSON.stringify(messageData));
        console.log(`💾 Mensaje almacenado en Redis: ${messageKey}`);
        
        res.status(200).json({
            success: true,
            message: "✓",
            key: messageKey
        });
    } catch (error) {
        console.error('Error procesando mensaje:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Función para procesar los bundles
async function processBundles() {
    try {
        // Obtener todas las claves de mensajes
        const keys = await redis.keys('message:*');
        if (keys.length === 0) return;

        // Agrupar mensajes por usuario/chatbot
        const bundles = {};
        const currentTime = Date.now();

        for (const key of keys) {
            const messageData = JSON.parse(await redis.get(key));
            const userChatbotKey = `${messageData.user_id}:${messageData.chatbot_id}`;
            const firstMessageTime = messageData.first_message_time;
            const timeElapsed = currentTime - firstMessageTime;

            // Si han pasado 20 segundos desde el primer mensaje
            if (timeElapsed >= 20000) {
                if (!bundles[userChatbotKey]) {
                    bundles[userChatbotKey] = {
                        messages: [],
                        keys: [],
                        userId: messageData.user_id,
                        chatbotId: messageData.chatbot_id
                    };
                }
                bundles[userChatbotKey].messages.push(messageData.message);
                bundles[userChatbotKey].keys.push(key);
            }
        }

        // Procesar cada bundle
        for (const userChatbotKey in bundles) {
            const bundle = bundles[userChatbotKey];
            const webhookUrl = chatbotsConfig[bundle.chatbotId]?.webhook;
            
            if (!webhookUrl) {
                console.error(`⚠️ No se encontró webhook para ${bundle.chatbotId}`);
                continue;
            }

            try {
                // Enviar bundle a Make
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: bundle.userId,
                        chatbot_id: bundle.chatbotId,
                        messages: bundle.messages,
                        timestamp: new Date().toISOString()
                    })
                });

                if (response.ok) {
                    console.log(`✅ Bundle enviado para ${userChatbotKey}`);
                    
                    // Borrar todos los mensajes del bundle
                    for (const key of bundle.keys) {
                        await redis.del(key);
                    }
                    
                    // Borrar el tiempo del primer mensaje
                    await redis.del(`first_message_time:${userChatbotKey}`);
                    console.log(`🧹 Mensajes y tiempo eliminados para ${userChatbotKey}`);
                }
            } catch (error) {
                console.error(`❌ Error procesando bundle para ${userChatbotKey}:`, error);
            }
        }
    } catch (error) {
        console.error('Error en processBundles:', error);
    }
}

// Ejecutar el procesador cada 5 segundos
setInterval(processBundles, 5000);

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server = app.listen(PORT, () => {
    console.log(`==> Your service is live 🎉`);
});

// Manejar cierre graceful
process.on('SIGTERM', async () => {
    console.log('SIGTERM recibido. Cerrando...');
    if (server) server.close();
    await redis.quit();
    process.exit(0);
});
