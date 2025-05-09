console.log('=== INICIANDO SERVER.JS ===', __filename, new Date().toISOString());
const express = require('express');
const Redis = require('ioredis');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const logger = require('./src/utils/logger');
require('dotenv').config();
const cron = require('node-cron');
const basicAuth = require('basic-auth');

// Configuración de Cloudinary
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuración de almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'chatbot-uploads',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp3', 'wav'],
        resource_type: 'auto'
    }
});

// Configuración de Multer con Cloudinary
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

// Crear la aplicación Express
const app = express();
let server = null;

// Configuración de Redis
const redis = new Redis(process.env.REDIS_URL);

// Cargar configuración de chatbots
const chatbotsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'chatbots.json'), 'utf8'));

// Función para cerrar la aplicación gracefully
async function gracefulShutdown(signal) {
    logger.info(`${signal} recibido. Iniciando cierre graceful...`);
    
    if (server) {
        logger.info('Cerrando servidor HTTP...');
        server.close(() => {
            logger.info('Servidor HTTP cerrado.');
        });
    }

    try {
        logger.info('Cerrando conexión Redis...');
        await redis.quit();
        logger.info('Conexión Redis cerrada.');
    } catch (err) {
        logger.error('Error al cerrar Redis:', { error: err.message });
    }

    // Dar tiempo para que se completen las operaciones pendientes
    setTimeout(() => {
        logger.info('Proceso terminado.');
        process.exit(0);
    }, 1000);
}

// Manejar señales de terminación
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/Widget', express.static('Widget'));

const adminUser = process.env.ADMIN_USER || 'Gestor';
const adminPass = process.env.ADMIN_PASS || 'P@rcekiller';

function auth(req, res, next) {
    const user = basicAuth(req);
    if (!user || user.name !== adminUser || user.pass !== adminPass) {
        res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
        return res.status(401).send('Authentication required.');
    }
    next();
}

// Proteger el panel de administración y endpoints de gestión de chatbots
app.use(['/admin', '/api/chatbots', '/api/chatbots/:id'], auth);

// Servir el panel de administración
app.get('/admin', (req, res) => {
    const adminPath = path.resolve(__dirname, 'admin-panel.html');
    logger.info(`[ADMIN] Intentando servir: ${adminPath}`);
    res.sendFile(adminPath);
});

// Variable para rastrear el tiempo del primer mensaje por usuario y chatbot
const userFirstMessageTime = new Map();

// Middleware de logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Petición procesada', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`
        });
    });
    next();
});

// Ruta para recibir mensajes
app.post('/api/messages', upload.single('file'), async (req, res) => {
    console.log('DEBUG req.file:', req.file);
    console.log('DEBUG req.body:', req.body);
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

        logger.info('Mensaje recibido', { user_id, chatbot_id, message, timestamp, file: req.file?.path });
        
        // Registrar el tiempo del primer mensaje si no existe
        const userChatbotKey = `${user_id}:${chatbot_id}`;
        if (!userFirstMessageTime.has(userChatbotKey)) {
            userFirstMessageTime.set(userChatbotKey, Date.now());
            logger.info('Iniciando temporizador para usuario y chatbot', { user_id, chatbot_id });
        }
        
        // Crear una clave única para el mensaje
        const messageKey = `message:${chatbot_id}:${user_id}:${Date.now()}`;
        
        // Preparar el mensaje con información del archivo si existe
        const messageData = {
            user_id,
            chatbot_id,
            message: message || '', // Permitir mensaje vacío
            timestamp: timestamp || new Date().toISOString(),
            processed: false,
            bundled: false,
            first_message_time: userFirstMessageTime.get(userChatbotKey)
        };

        if (req.file) {
            messageData.file = {
                url: req.file.path || req.file.url || req.file.secure_url, // Asegura la URL pública
                mimetype: req.file.mimetype,
                size: req.file.size
            };
        }
        
        // Almacenar el mensaje en Redis con expiración de 5 minutos
        await redis.setex(messageKey, 300, JSON.stringify(messageData));
        logger.info('Mensaje almacenado en Redis', { messageKey });
        
        res.status(200).json({
            success: true,
            message: "✓",
            key: messageKey
        });
    } catch (error) {
        console.error('ERROR EN /api/messages:', error);
        logger.error('Error procesando mensaje:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message || error
        });
    }
});

// Nueva ruta para verificar el estado de los mensajes
app.get('/api/messages/status', async (req, res) => {
    try {
        const { user_id, chatbot_id } = req.query;
        if (!user_id || !chatbot_id) {
            return res.status(400).json({ error: 'Se requieren user_id y chatbot_id' });
        }

        // Buscar mensajes del usuario y chatbot específico
        const messageKeys = await redis.keys(`message:${chatbot_id}:${user_id}:*`);
        const responseKeys = await redis.keys(`response:${chatbot_id}:${user_id}:*`);
        let allProcessed = true;
        let makeResponse = null;
        let responseFound = false;

        // Verificar si hay mensajes sin procesar
        for (const key of messageKeys) {
            const messageData = await redis.get(key);
            if (messageData) {
                const message = JSON.parse(messageData);
                if (!message.processed) {
                    allProcessed = false;
                    break;
                }
            }
        }

        // Buscar SOLO la respuesta más reciente
        if (responseKeys.length > 0) {
            // Ordenar las claves por timestamp
            responseKeys.sort((a, b) => {
                const timestampA = parseInt(a.split(':').pop());
                const timestampB = parseInt(b.split(':').pop());
                return timestampB - timestampA;
            });

            // Tomar SOLO la respuesta más reciente
            const latestResponse = await redis.get(responseKeys[0]);
            if (latestResponse) {
                const responseData = JSON.parse(latestResponse);
                makeResponse = responseData.makeResponse;
                responseFound = true;
                
                // Eliminar la respuesta después de enviarla
                await redis.del(responseKeys[0]);
                logger.info(`🗑️ Respuesta eliminada después de enviarla: ${responseKeys[0]}`);
            }
        }

        res.status(200).json({
            processed: allProcessed,
            makeResponse: makeResponse,
            responseFound: responseFound
        });
    } catch (error) {
        logger.error('Error verificando estado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Función para agrupar mensajes por usuario y chatbot
async function createMessageBundles() {
    try {
        // Obtener todas las claves de mensajes no procesados
        const keys = await redis.keys('message:*');
        
        if (keys.length > 0) {
            logger.info(`🔍 Encontrados ${keys.length} mensajes para procesar`);
        }

        // Agrupar mensajes por chatbot_id y user_id
        const messagesByUserChatbot = {};
        const currentTime = Date.now();
        
        // Primero, ordenar las claves por timestamp
        keys.sort((a, b) => {
            const timestampA = parseInt(a.split(':').pop());
            const timestampB = parseInt(b.split(':').pop());
            return timestampA - timestampB;
        });
        
        for (const key of keys) {
            const messageData = await redis.get(key);
            if (messageData) {
                const message = JSON.parse(messageData);
                if (!message.processed && !message.bundled) {
                    const userId = message.user_id;
                    const chatbotId = message.chatbot_id;
                    const userChatbotKey = `${userId}:${chatbotId}`;
                    const firstMessageTime = message.first_message_time;
                    const timeElapsed = currentTime - firstMessageTime;

                    // Solo procesar si han pasado 20 segundos desde el primer mensaje
                    if (timeElapsed >= 20000) {
                        if (!messagesByUserChatbot[userChatbotKey]) {
                            messagesByUserChatbot[userChatbotKey] = {
                                messages: [],
                                files: [],
                                keys: [],
                                firstMessageTime: firstMessageTime,
                                userId: userId,
                                chatbotId: chatbotId
                            };
                            logger.info(`👤 Nuevo usuario ${userId} y chatbot ${chatbotId} agregado al bundle`);
                        }
                        
                        // Marcar el mensaje como bundled antes de agregarlo
                        message.bundled = true;
                        await redis.setex(key, 300, JSON.stringify(message));
                        
                        messagesByUserChatbot[userChatbotKey].messages.push(message.message);
                        if (message.file) {
                            messagesByUserChatbot[userChatbotKey].files.push(message.file);
                        }
                        messagesByUserChatbot[userChatbotKey].keys.push(key);
                    } else {
                        logger.info(`⏳ Esperando ${((20000 - timeElapsed)/1000).toFixed(1)} segundos más para el usuario ${userId} y chatbot ${chatbotId}`);
                    }
                }
            }
        }

        // Procesar los bundles que han cumplido el tiempo de espera
        for (const userChatbotKey in messagesByUserChatbot) {
            const bundle = messagesByUserChatbot[userChatbotKey];
            if (bundle.messages.length > 0) {
                logger.info(`📦 Creando bundle para usuario ${bundle.userId} y chatbot ${bundle.chatbotId} con ${bundle.messages.length} mensajes después de 20 segundos`);
                
                try {
                    // Obtener el webhook URL del chatbot
                    const webhookUrl = chatbotsConfig[bundle.chatbotId]?.webhook;
                    if (!webhookUrl) {
                        logger.error(`⚠️ No se encontró webhook URL para el chatbot ${bundle.chatbotId}`);
                        continue;
                    }

                    const response = await fetch(webhookUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_id: bundle.userId,
                            chatbot_id: bundle.chatbotId,
                            messages: bundle.messages,
                            files: bundle.files,
                            bundle_size: bundle.messages.length,
                            timestamp: new Date().toISOString(),
                            total_wait_time: (Date.now() - bundle.firstMessageTime) / 1000
                        })
                    });

                    if (response.ok) {
                        logger.info(`✅ Bundle enviado exitosamente para usuario ${bundle.userId} y chatbot ${bundle.chatbotId}`);
                        const makeResponse = await response.text();
                        logger.info(`📩 Respuesta de Make: ${makeResponse}`);
                        
                        // Verificar si ya existe una respuesta para este usuario y chatbot
                        const existingResponseKeys = await redis.keys(`response:${bundle.chatbotId}:${bundle.userId}:*`);
                        if (existingResponseKeys.length > 0) {
                            // Eliminar respuestas anteriores
                            for (const key of existingResponseKeys) {
                                await redis.del(key);
                                logger.info(`🗑️ Respuesta anterior eliminada: ${key}`);
                            }
                        }
                        
                        // Almacenar UNA SOLA respuesta para todo el bundle
                        const responseKey = `response:${bundle.chatbotId}:${bundle.userId}:${Date.now()}`;
                        await redis.setex(responseKey, 300, JSON.stringify({
                            user_id: bundle.userId,
                            chatbot_id: bundle.chatbotId,
                            makeResponse: makeResponse,
                            timestamp: new Date().toISOString(),
                            bundle_size: bundle.messages.length
                        }));
                        logger.info(`💾 Respuesta almacenada en Redis con clave: ${responseKey}`);
                        
                        // Eliminar TODOS los mensajes del bundle de Redis inmediatamente
                        for (const key of bundle.keys) {
                            await redis.del(key);
                            logger.info(`🗑️ Mensaje eliminado de Redis: ${key}`);
                        }
                        // Limpiar el tiempo del primer mensaje para este usuario y chatbot
                        userFirstMessageTime.delete(userChatbotKey);
                        logger.info(`🧹 Tiempo de primer mensaje eliminado para usuario ${bundle.userId} y chatbot ${bundle.chatbotId}`);
                    } else {
                        const errorText = await response.text();
                        logger.error(`⚠️ Error al enviar bundle para usuario ${bundle.userId} y chatbot ${bundle.chatbotId}: ${errorText}`);
                        
                        // Si hay error, desmarcar los mensajes como bundled
                        for (const key of bundle.keys) {
                            const messageData = await redis.get(key);
                            if (messageData) {
                                const message = JSON.parse(messageData);
                                message.bundled = false;
                                await redis.setex(key, 300, JSON.stringify(message));
                            }
                        }
                    }
                } catch (error) {
                    logger.error(`❌ Error procesando bundle para usuario ${bundle.userId} y chatbot ${bundle.chatbotId}:`, error);
                }
            }
        }
    } catch (error) {
        logger.error('❌ Error en createMessageBundles:', error);
    }
}

// Ejecutar el procesador de bundles cada 5 segundos
const BUNDLE_INTERVAL = 5000; // 5 segundos para revisar más frecuentemente
logger.info(`⚙️ Configurando procesador de bundles para ejecutarse cada ${BUNDLE_INTERVAL/1000} segundos`);
setInterval(createMessageBundles, BUNDLE_INTERVAL);

// Ruta para obtener todos los chatbots
app.get('/api/chatbots', (req, res) => {
    try {
        const chatbots = JSON.parse(fs.readFileSync(path.join(__dirname, 'chatbots.json'), 'utf8'));
        res.json(chatbots);
    } catch (error) {
        logger.error('Error al leer chatbots:', error);
        res.status(500).json({ error: 'Error al leer la configuración de chatbots' });
    }
});

// Ruta para agregar un nuevo chatbot
app.post('/api/chatbots', (req, res) => {
    try {
        const { id, webhook, name, description } = req.body;
        
        // Validaciones básicas
        if (!id || !webhook || !name || !description) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        // Leer el archivo actual
        const chatbots = JSON.parse(fs.readFileSync(path.join(__dirname, 'chatbots.json'), 'utf8'));
        
        // Verificar si el ID ya existe
        if (chatbots[id]) {
            return res.status(400).json({ error: 'El ID del chatbot ya existe' });
        }

        // Agregar el nuevo chatbot
        chatbots[id] = {
            webhook,
            name,
            description
        };

        // Guardar el archivo actualizado
        fs.writeFileSync(path.join(__dirname, 'chatbots.json'), JSON.stringify(chatbots, null, 2));
        
        logger.info('Nuevo chatbot agregado', { id, name });
        res.json({ success: true, message: 'Chatbot agregado exitosamente' });
    } catch (error) {
        logger.error('Error al agregar chatbot:', error);
        res.status(500).json({ error: 'Error al agregar el chatbot' });
    }
});

// Ruta para eliminar un chatbot
app.delete('/api/chatbots/:id', (req, res) => {
    try {
        const id = req.params.id;
        const chatbots = JSON.parse(fs.readFileSync(path.join(__dirname, 'chatbots.json'), 'utf8'));
        if (!chatbots[id]) {
            return res.status(404).json({ error: 'Chatbot no encontrado' });
        }
        delete chatbots[id];
        fs.writeFileSync(path.join(__dirname, 'chatbots.json'), JSON.stringify(chatbots, null, 2));
        logger.info('Chatbot eliminado', { id });
        res.json({ success: true, message: 'Chatbot eliminado exitosamente' });
    } catch (error) {
        logger.error('Error al eliminar chatbot:', error);
        res.status(500).json({ error: 'Error al eliminar el chatbot' });
    }
});

// Tarea programada para borrar archivos de Cloudinary diariamente a las 3:00 AM
cron.schedule('0 3 * * *', async () => {
    try {
        const result = await cloudinary.api.delete_resources_by_prefix('chatbot-uploads/');
        logger.info('Archivos de Cloudinary eliminados diariamente:', result);
    } catch (error) {
        logger.error('Error al eliminar archivos de Cloudinary:', error);
    }
});

// Middleware de manejo de errores para Multer y otros
app.use((err, req, res, next) => {
    console.error('ERROR GLOBAL:', err);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor (middleware global)',
        details: err.message || err
    });
});

// Iniciar el servidor con manejo de errores mejorado
const PORT = process.env.PORT || 3001;

function startServer() {
    return new Promise((resolve, reject) => {
        server = app.listen(PORT, () => {
            logger.info(` Servidor ejecutándose en el puerto ${PORT}`);
            resolve(server);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.info(`⚠️ Puerto ${PORT} en uso, intentando cerrar el proceso existente...`);
                require('child_process').exec(`npx kill-port ${PORT}`, async (error) => {
                    if (error) {
                        logger.error('❌ Error al liberar el puerto:', error);
                        reject(error);
                        return;
                    }
                    logger.info(`✅ Puerto ${PORT} liberado, reiniciando servidor...`);
                    setTimeout(startServer, 1000);
                });
            } else {
                logger.error('❌ Error al iniciar el servidor:', err);
                reject(err);
            }
        });
    });
}

// Iniciar el servidor
startServer().catch(err => {
    logger.error('Error fatal al iniciar el servidor:', err);
    process.exit(1);
});
