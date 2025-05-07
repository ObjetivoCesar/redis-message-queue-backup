const widgetGenerator = require('../services/widgetGenerator');

// Ejemplo de configuración personalizada para un chatbot
const customConfig = {
    id: 'mi-chatbot-personalizado',
    appearance: {
        colors: {
            primary: '#4f46e5', // Color principal personalizado
            textUser: '#ffffff'
        },
        font: {
            family: 'Arial, sans-serif',
            size: {
                base: '16px',
                title: '20px'
            }
        },
        dimensions: {
            width: '350px',
            height: '600px'
        }
    },
    texts: {
        title: 'Asistente de Ventas',
        welcomeMessage: '¡Hola! 👋 Soy tu asistente de ventas personal. ¿En qué puedo ayudarte hoy?',
        inputPlaceholder: 'Escribe tu pregunta aquí...'
    },
    system: {
        timeouts: {
            bundle: 30000 // 30 segundos para este chatbot específico
        },
        endpoints: {
            webhook: 'https://hook.us2.make.com/tu-webhook-personalizado'
        }
    }
};

// Función de ejemplo para crear un nuevo chatbot
async function createCustomChatbot() {
    try {
        // Generar el widget personalizado
        const result = await widgetGenerator.generate(customConfig);
        
        console.log('Widget generado exitosamente!');
        console.log('\nCódigos de integración:');
        console.log('\nScript tag:');
        console.log(result.integrations.script);
        console.log('\nInline div:');
        console.log(result.integrations.inline);
        console.log('\nURL directa:');
        console.log(result.integrations.url);
        
        // En un caso real, aquí guardaríamos la configuración en la base de datos
        // y el widget generado en un CDN o sistema de archivos
        
    } catch (error) {
        console.error('Error al generar el widget:', error);
    }
}

// Ejecutar el ejemplo
createCustomChatbot(); 