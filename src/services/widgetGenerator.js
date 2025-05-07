const fs = require('fs');
const path = require('path');
const defaultConfig = require('../config/chatbot.config');

class WidgetGenerator {
    constructor() {
        this.templatePath = path.join(__dirname, '../../public/widget.html');
    }

    /**
     * Genera un widget personalizado basado en la configuración proporcionada
     * @param {Object} config Configuración personalizada del chatbot
     * @returns {Object} Objeto con el código del widget y scripts de integración
     */
    async generate(config) {
        // Combinar configuración por defecto con la personalizada
        const finalConfig = this.mergeConfigs(defaultConfig, config);
        
        // Leer la plantilla del widget
        const template = await fs.promises.readFile(this.templatePath, 'utf8');
        
        // Generar estilos personalizados
        const styles = this.generateStyles(finalConfig.appearance);
        
        // Reemplazar variables en la plantilla
        const widgetCode = template
            .replace('${STYLES}', styles)
            .replace('${CHATBOT_CONFIG}', JSON.stringify(finalConfig))
            .replace('${TITLE}', finalConfig.texts.title)
            .replace('${WELCOME_MESSAGE}', finalConfig.texts.welcomeMessage)
            .replace('${INPUT_PLACEHOLDER}', finalConfig.texts.inputPlaceholder)
            .replace('${FORM_BUTTON_TEXT}', finalConfig.texts.formButtonText)
            .replace('${SUBMIT_BUTTON_TEXT}', finalConfig.texts.submitButtonText);

        // Generar códigos de integración
        return {
            widget: widgetCode,
            integrations: {
                script: `<script src="https://your-domain.com/widgets/${config.id}.js"></script>`,
                inline: `<div id="chatbot-${config.id}"></div>`,
                url: `https://your-domain.com/widgets/${config.id}.html`
            }
        };
    }

    /**
     * Combina la configuración por defecto con la personalizada
     * @param {Object} defaultConfig Configuración por defecto
     * @param {Object} customConfig Configuración personalizada
     * @returns {Object} Configuración combinada
     */
    mergeConfigs(defaultConfig, customConfig) {
        return {
            ...defaultConfig,
            ...customConfig,
            appearance: {
                ...defaultConfig.appearance,
                ...customConfig.appearance,
                colors: {
                    ...defaultConfig.appearance.colors,
                    ...customConfig.appearance?.colors
                },
                font: {
                    ...defaultConfig.appearance.font,
                    ...customConfig.appearance?.font,
                    size: {
                        ...defaultConfig.appearance.font.size,
                        ...customConfig.appearance?.font?.size
                    }
                },
                dimensions: {
                    ...defaultConfig.appearance.dimensions,
                    ...customConfig.appearance?.dimensions
                },
                spacing: {
                    ...defaultConfig.appearance.spacing,
                    ...customConfig.appearance?.spacing
                }
            },
            texts: {
                ...defaultConfig.texts,
                ...customConfig.texts
            },
            system: {
                ...defaultConfig.system,
                ...customConfig.system,
                timeouts: {
                    ...defaultConfig.system.timeouts,
                    ...customConfig.system?.timeouts
                },
                files: {
                    ...defaultConfig.system.files,
                    ...customConfig.system?.files,
                    storage: {
                        ...defaultConfig.system.files.storage,
                        ...customConfig.system?.files?.storage
                    }
                }
            }
        };
    }

    /**
     * Genera los estilos CSS personalizados basados en la configuración
     * @param {Object} appearance Configuración de apariencia
     * @returns {String} Estilos CSS
     */
    generateStyles(appearance) {
        return `
            :root {
                --chatbot-primary: ${appearance.colors.primary};
                --chatbot-secondary: ${appearance.colors.secondary};
                --chatbot-text-user: ${appearance.colors.textUser};
                --chatbot-text-bot: ${appearance.colors.textBot};
                --chatbot-background: ${appearance.colors.background};
                --chatbot-font-family: ${appearance.font.family};
                --chatbot-font-size-base: ${appearance.font.size.base};
                --chatbot-font-size-title: ${appearance.font.size.title};
                --chatbot-font-size-message: ${appearance.font.size.message};
                --chatbot-font-size-input: ${appearance.font.size.input};
                --chatbot-width: ${appearance.dimensions.width};
                --chatbot-height: ${appearance.dimensions.height};
                --chatbot-input-height: ${appearance.dimensions.inputHeight};
                --chatbot-border-radius: ${appearance.dimensions.borderRadius};
                --chatbot-padding: ${appearance.spacing.padding};
                --chatbot-gap: ${appearance.spacing.gap};
                --chatbot-message-spacing: ${appearance.spacing.messageSpacing};
            }
        `;
    }
}

module.exports = new WidgetGenerator(); 