const winston = require('winston');
const path = require('path');

// Configuración de formatos
const { combine, timestamp, printf, colorize, align } = winston.format;

// Formato personalizado para los logs
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
});

// Crear el logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        align(),
        logFormat
    ),
    transports: [
        // Logs de error en archivo separado
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Todos los logs en archivo
        new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ]
});

// Si no estamos en producción, también mostrar logs en consola
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            colorize({ all: true }),
            timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            align(),
            logFormat
        )
    }));
}

// Crear directorio de logs si no existe
const fs = require('fs');
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

// Funciones helper para diferentes niveles de log
const info = (message, metadata = {}) => logger.info(message, metadata);
const error = (message, metadata = {}) => logger.error(message, metadata);
const warn = (message, metadata = {}) => logger.warn(message, metadata);
const debug = (message, metadata = {}) => logger.debug(message, metadata);

module.exports = {
    info,
    error,
    warn,
    debug,
    logger
}; 