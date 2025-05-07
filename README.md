# Sistema de Mensajes con Redis y Make.com

## Descripción
Sistema de procesamiento de mensajes que agrupa mensajes durante 20 segundos antes de enviarlos a Make.com para su procesamiento. Incluye un panel de administración para gestionar webhooks y chatbots.

## Requisitos
- Docker Desktop
- Node.js (versión 14 o superior)
- npm (gestor de paquetes de Node.js)

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Asegurarse que Docker Desktop esté en ejecución
4. Iniciar Redis:
   ```bash
   docker run -d -p 6379:6379 redis
   ```
5. Iniciar el servidor:
   ```bash
   node server.js
   ```

## Estructura del Proyecto

- `server.js`: Servidor principal
- `src/`: Código fuente
  - `routes/`: Rutas de la API
  - `controllers/`: Controladores de la aplicación
  - `services/`: Servicios de negocio
  - `utils/`: Utilidades y helpers
- `public/`: Archivos estáticos
  - `css/`: Estilos CSS
  - `js/`: Scripts JavaScript
  - `img/`: Imágenes
- `uploads/`: Directorio para archivos subidos
- `logs/`: Archivos de registro
- `Widget/`: Código del widget de chat

## Configuración

### Variables de Entorno
- PORT: Puerto donde escucha el servidor (por defecto 3001)
- REDIS_URL: URL de conexión a Redis (por defecto localhost:6379)

### Webhook de Make.com
El webhook está configurado en:
```
https://hook.us2.make.com/vy46yk4a2c202wnyyma2n78v4id4hb2h
```

## Uso

### API Endpoints
1. El servidor escucha en el puerto 3001
2. Los mensajes se envían a `/api/messages`
3. El estado se consulta en `/api/messages/status`

### Panel de Administración
El panel de administración está disponible en `/admin` y permite:
- Gestionar webhooks de Make.com
- Ver información de chatbots
- Configurar el widget de chat
- Administrar la cola de mensajes

### Widget de Chat
El widget de chat se puede integrar en cualquier sitio web usando el siguiente código:
```html
<script src="http://localhost:3001/widget/chat.js"></script>
<div id="chat-widget"></div>
```

## Documentación
Para más detalles, consultar el archivo `DOCUMENTACION.md` 