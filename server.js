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

// Verificar conexión Redis al inicio
redis.on('connect', () => {
    logger.info('Conexión a Redis establecida correctamente');
});

redis.on('error', (err) => {
    logger.error('Error de conexión a Redis:', err);
});

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
app.use(cors({
    origin: ['https://cdpn.io', 'https://codepen.io', 'http://localhost:3001', 'https://redis-message-queue-backup.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
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

// --- RUTAS DEL PANEL DE ADMINISTRACIÓN SOLO SI ADMIN_PANEL_ENABLED=true ---
const adminPanelEnabled = process.env.ADMIN_PANEL_ENABLED === 'true';

if (adminPanelEnabled) {
    // Proteger el panel de administración y endpoints de gestión de chatbots
    app.use(['/admin', '/api/chatbots', '/api/chatbots/:id'], auth);

    // Servir el panel de administración
    app.get('/admin', (req, res) => {
        const adminPath = path.resolve(__dirname, 'admin-panel.html');
        logger.info(`[ADMIN] Intentando servir: ${adminPath}`);
        res.sendFile(adminPath);
    });

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

    // Ruta para descargar el archivo chatbots.json
    app.get('/api/chatbots/download', auth, (req, res) => {
        const filePath = path.join(__dirname, 'chatbots.json');
        res.download(filePath, 'chatbots.json', (err) => {
            if (err) {
                logger.error('Error al descargar chatbots.json:', err);
                res.status(500).send('Error al descargar el archivo');
            }
        });
    });
}

// --- FIN DE RUTAS DEL PANEL DE ADMINISTRACIÓN ---

// Ruta para recibir mensajes
app.post('/api/messages', upload.single('file'), async (req, res) => {
    try {
        const { user_id, chatbot_id, message, timestamp } = req.body;
        const file = req.file;

        // Validar datos requeridos
        if (!user_id || !chatbot_id || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan datos requeridos' 
            });
        }

        // Verificar que el chatbot existe
        if (!chatbotsConfig[chatbot_id]) {
            return res.status(404).json({
                success: false,
                error: 'Chatbot no encontrado'
            });
        }

        // Crear objeto de mensaje
        const messageData = {
            user_id,
            chatbot_id,
            message,
            timestamp: timestamp || new Date().toISOString(),
            file: file ? {
                url: file.path,
                type: file.mimetype,
                size: file.size
            } : null
        };

        // Guardar mensaje en Redis
        const key = `messages:${chatbot_id}:${user_id}`;
        await redis.lpush(key, JSON.stringify(messageData));
        
        // Establecer tiempo de expiración (24 horas)
        await redis.expire(key, 24 * 60 * 60);

        logger.info('Mensaje guardado en Redis:', messageData);

        // Enviar mensaje a Make.com inmediatamente
        try {
            const webhookUrl = chatbotsConfig[chatbot_id].webhook;
            const makeResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageData)
            });

            if (!makeResponse.ok) {
                logger.error('Error al enviar mensaje a Make.com:', await makeResponse.text());
            }
        } catch (error) {
            logger.error('Error al enviar mensaje a Make.com:', error);
        }

        res.json({ 
            success: true, 
            message: 'Mensaje recibido correctamente',
            data: messageData
        });
    } catch (error) {
        logger.error('Error al procesar mensaje:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al procesar el mensaje',
            details: error.message 
        });
    }
});

// Ruta para verificar el estado de los mensajes
app.get('/api/messages/status', async (req, res) => {
    try {
        const { user_id, chatbot_id } = req.query;
        
        if (!user_id || !chatbot_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requieren user_id y chatbot_id' 
            });
        }

        const key = `messages:${chatbot_id}:${user_id}`;
        const messages = await redis.lrange(key, 0, -1);
        const parsedMessages = messages.map(msg => JSON.parse(msg));

        res.json({ 
            success: true, 
            status: 'ok',
            message: 'API de mensajes funcionando correctamente',
            data: {
                messageCount: parsedMessages.length,
                messages: parsedMessages
            }
        });
    } catch (error) {
        logger.error('Error al obtener estado de mensajes:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al obtener estado de mensajes',
            details: error.message 
        });
    }
});

// Endpoint para probar webhooks
app.post('/api/test-webhook', async (req, res) => {
    try {
        const { chatbot_id } = req.body;
        const chatbot = chatbotsConfig[chatbot_id];
        
        if (!chatbot || !chatbot.webhook) {
            return res.status(404).json({
                success: false,
                error: 'Chatbot no encontrado'
            });
        }

        const testResponse = await fetch(chatbot.webhook, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                test: true,
                timestamp: new Date().toISOString()
            })
        });

        res.json({
            success: true,
            status: testResponse.status,
            message: 'Webhook probado correctamente'
        });
    } catch (error) {
        logger.error('Error al probar webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Error al probar webhook',
            details: error.message
        });
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
