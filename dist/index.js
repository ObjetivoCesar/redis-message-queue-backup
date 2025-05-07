"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const messageService_1 = require("./services/messageService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Middleware de autenticación
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || token !== process.env.WEBHOOK_TOKEN) {
        return res.status(401).json({
            success: false,
            error: 'No autorizado'
        });
    }
    next();
};
// Endpoint principal
app.post('/webhook', authMiddleware, async (req, res) => {
    try {
        const { chatId, message } = req.body;
        if (!chatId || !message) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere chatId y message'
            });
        }
        const messageData = {
            chatId,
            message,
            timestamp: Date.now()
        };
        const { status, response } = await messageService_1.MessageService.processMessage(messageData);
        return res.status(status).json(response);
    }
    catch (error) {
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
//# sourceMappingURL=index.js.map