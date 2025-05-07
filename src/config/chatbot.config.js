/**
 * Configuración base para los chatbots
 */
const defaultConfig = {
    // Configuración visual
    appearance: {
        // Colores principales
        colors: {
            primary: '#e5993b',           // Naranjo original
            secondary: '#1e293b',         // Azul oscuro para el fondo secundario
            textUser: '#ffffff',          // Texto blanco para mensajes de usuario
            textBot: '#e2e8f0',          // Texto gris claro para mensajes del bot
            background: '#0f172a'         // Azul muy oscuro para el fondo principal
        },
        // Fuentes
        font: {
            family: 'inherit',
            size: {
                base: '14px',
                title: '16px',
                message: '14px',
                input: '14px'
            }
        },
        // Dimensiones
        dimensions: {
            width: '300px',
            height: '580px',
            inputHeight: '50px',
            borderRadius: '8px'
        },
        // Espaciado
        spacing: {
            padding: '16px',
            gap: '8px',
            messageSpacing: '12px'
        }
    },

    // Configuración de textos
    texts: {
        title: 'Asistente Virtual',
        welcomeMessage: '¡Hola! 👋 Soy el asistente virtual. ¿En qué puedo ayudarte?',
        inputPlaceholder: 'Escribe tu mensaje...',
        formButtonText: 'Formulario',
        submitButtonText: 'Enviar'
    },

    // Configuración del sistema
    system: {
        // Tiempos
        timeouts: {
            bundle: 20000, // 20 segundos para agrupar mensajes
            redis: 300 // 5 minutos de expiración en Redis
        },
        // Archivos
        files: {
            maxSize: 10 * 1024 * 1024, // 10MB
            allowedTypes: ['image/*', 'audio/*'],
            storage: {
                path: 'uploads/',
                tempExpiry: 24 * 60 * 60 // 24 horas
            }
        },
        // Endpoints
        endpoints: {
            messages: '/api/messages',
            status: '/api/messages/status',
            files: '/uploads'
        }
    },

    // Configuración de seguridad
    security: {
        allowedDomains: ['*'], // Dominios permitidos para el widget
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100 // límite de solicitudes por ventana
        }
    }
};

module.exports = defaultConfig; 