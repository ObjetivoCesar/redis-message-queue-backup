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
