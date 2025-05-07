# Documentación del Sistema de Mensajes con Redis y Make.com

## 1. Docker y su Rol en el Sistema

### ¿Qué es Docker?
Docker es una plataforma que permite crear, desplegar y ejecutar aplicaciones en contenedores. Un contenedor es una unidad de software que empaqueta el código y todas sus dependencias para que la aplicación se ejecute de manera rápida y confiable en cualquier entorno.

### ¿Por qué usamos Docker en este proyecto?
En nuestro sistema, Docker se utiliza para ejecutar Redis, que es nuestra base de datos en memoria. Esto nos proporciona varias ventajas:

1. **Consistencia**: Redis se ejecuta en el mismo entorno en cualquier máquina donde se despliegue la aplicación.
2. **Aislamiento**: Redis corre en su propio contenedor, separado de otros servicios.
3. **Facilidad de despliegue**: No necesitamos instalar Redis directamente en la máquina host.
4. **Portabilidad**: El contenedor de Redis puede moverse fácilmente entre diferentes entornos.

### Configuración de Docker en el Proyecto
El contenedor de Redis está configurado para:
- Escuchar en el puerto 6379
- Persistir datos en memoria
- Estar disponible para la aplicación Node.js

## 2. Arquitectura del Sistema

### Componentes Principales
1. **Servidor Node.js**
   - Escucha en el puerto 3001
   - Maneja las peticiones HTTP
   - Procesa los mensajes entrantes

2. **Redis**
   - Almacena temporalmente los mensajes
   - Gestiona el tiempo de espera de 20 segundos
   - Almacena las respuestas de Make.com

3. **Make.com**
   - Recibe los bundles de mensajes
   - Procesa la lógica del chatbot
   - Devuelve una respuesta

### Flujo de Mensajes
1. El usuario envía un mensaje
2. El servidor:
   - Almacena el mensaje en Redis
   - Devuelve un "visto" inmediatamente
   - Inicia un temporizador de 20 segundos si es el primer mensaje

3. Después de 20 segundos:
   - Todos los mensajes recibidos se agrupan en un bundle
   - El bundle se envía a Make.com
   - Los mensajes se eliminan de Redis
   - Se almacena la respuesta de Make.com

4. El cliente:
   - Consulta periódicamente el estado de los mensajes
   - Recibe la respuesta cuando está disponible
   - La respuesta se elimina después de ser enviada

## 3. Configuración y Requisitos

### Requisitos del Sistema
- Docker Desktop instalado y en ejecución
- Node.js (versión 14 o superior)
- npm (gestor de paquetes de Node.js)

### Dependencias Principales
- express: Framework web para Node.js
- ioredis: Cliente Redis para Node.js
- node-fetch: Para hacer peticiones HTTP
- cors: Para manejar CORS
- multer: Para manejo de archivos

## 4. Instalación y Configuración

### Pasos para la Instalación
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

### Variables de Entorno
- PORT: Puerto donde escucha el servidor (por defecto 3001)
- REDIS_URL: URL de conexión a Redis (por defecto localhost:6379)

## 5. Mantenimiento y Monitoreo

### Logs
El sistema genera logs detallados que incluyen:
- Recepción de mensajes
- Almacenamiento en Redis
- Envío a Make.com
- Respuestas recibidas
- Eliminación de mensajes

### Monitoreo de Estado
- Redis: `redis-cli ping` debe responder "PONG"
- Servidor: Debe estar escuchando en el puerto 3001
- Make.com: Las respuestas deben llegar en el tiempo esperado

## 6. Solución de Problemas

### Problemas Comunes
1. **Redis no responde**
   - Verificar que Docker esté en ejecución
   - Comprobar que el contenedor de Redis esté activo

2. **No llegan respuestas de Make.com**
   - Verificar la URL del webhook
   - Comprobar los logs para ver si hay errores

3. **Mensajes duplicados**
   - Verificar que los mensajes se eliminen correctamente
   - Comprobar que las respuestas se eliminen después de enviarlas

### Herramientas de Diagnóstico
- `docker ps`: Ver contenedores activos
- `redis-cli monitor`: Monitorear actividad de Redis
- Logs del servidor: Ver actividad detallada 