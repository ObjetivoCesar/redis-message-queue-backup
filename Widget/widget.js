// Funciones para manejar el historial de chat en localStorage
const chatHistory = {
    save: function(messages) {
        localStorage.setItem(config.prefix + 'chat-history-' + config.chatbotId, JSON.stringify(messages));
    },
    load: function() {
        const saved = localStorage.getItem(config.prefix + 'chat-history-' + config.chatbotId);
        return saved ? JSON.parse(saved) : [];
    },
    add: function(message, isUser = false, file = null) {
        const messages = this.load();
        messages.push({ content: message, isUser, timestamp: new Date().toISOString(), file });
        this.save(messages);
    },
    clear: function() {
        localStorage.removeItem(config.prefix + 'chat-history-' + config.chatbotId);
    }
};

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

let userId = localStorage.getItem(config.prefix + 'user-id');
if (!userId) {
    userId = generateUUID();
    localStorage.setItem(config.prefix + 'user-id', userId);
}

const elements = {
    container: document.getElementById(config.prefix + 'chatbot-container'),
    button: document.getElementById(config.prefix + 'chatbot-button'),
    window: document.getElementById(config.prefix + 'chatbot-window'),
    header: document.getElementById(config.prefix + 'chatbot-header'),
    chatTitle: document.getElementById(config.prefix + 'chat-title'),
    formToggle: document.getElementById(config.prefix + 'form-toggle'),
    chatContainer: document.getElementById(config.prefix + 'chat-container'),
    formContainer: document.getElementById(config.prefix + 'form-container'),
    messageInput: document.getElementById(config.prefix + 'message-input'),
    sendButton: document.getElementById(config.prefix + 'send-button'),
    formSubmit: document.getElementById(config.prefix + 'form-submit'),
    inputArea: document.getElementById(config.prefix + 'input-area'),
    nameInput: document.getElementById(config.prefix + 'name-input'),
    phoneInput: document.getElementById(config.prefix + 'phone-input'),
    businessInput: document.getElementById(config.prefix + 'business-input'),
    productInput: document.getElementById(config.prefix + 'product-input'),
    subjectInput: document.getElementById(config.prefix + 'subject-input'),
    fileInput: document.getElementById(config.prefix + 'file-input'),
    attachButton: document.getElementById(config.prefix + 'attach-button'),
    filePreview: document.getElementById(config.prefix + 'file-preview'),
    fileName: document.getElementById(config.prefix + 'file-name'),
    removeFile: document.getElementById(config.prefix + 'remove-file')
};

// Aplicar configuración inicial
if (elements.button) elements.button.style.backgroundColor = config.primaryColor;
if (elements.header) elements.header.style.backgroundColor = config.primaryColor;
if (elements.chatTitle) elements.chatTitle.textContent = config.chatTitle;
if (elements.formToggle) {
    elements.formToggle.textContent = config.formButtonText;
    elements.formToggle.style.color = config.primaryColor;
}
if (elements.formSubmit) {
    elements.formSubmit.textContent = config.submitButtonText;
    elements.formSubmit.style.backgroundColor = config.primaryColor;
    elements.formSubmit.style.color = config.textColorUser;
}
if (elements.sendButton) {
    elements.sendButton.style.backgroundColor = config.primaryColor;
    elements.sendButton.style.color = config.textColorUser;
}

let initialMessageSent = false;
const chatIconSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 24px !important; height: 24px !important; fill: none !important; stroke: '+config.textColorUser+' !important; stroke-width: 2 !important; stroke-linecap: round !important; stroke-linejoin: round !important;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
const closeIconSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 24px !important; height: 24px !important; fill: none !important; stroke: '+config.textColorUser+' !important; stroke-width: 2 !important; stroke-linecap: round !important;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

if(elements.button) elements.button.innerHTML = chatIconSVG;

elements.button.addEventListener('click', () => {
    const isHidden = elements.window.style.display === 'none';
    elements.window.style.display = isHidden ? 'flex' : 'none';
    elements.button.innerHTML = isHidden ? closeIconSVG : chatIconSVG;
    
    if (isHidden) {
        if (!initialMessageSent && elements.chatContainer && elements.chatContainer.children.length === 0) {
            // Cargar historial guardado
            const messages = chatHistory.load();
            if (messages.length === 0) {
                setTimeout(() => {
                    addMessage(config.initialMessage);
                    initialMessageSent = true;
                }, 100);
            } else {
                messages.forEach(msg => {
                    const messageDiv = document.createElement('div');
                    messageDiv.style.cssText = `max-width: 80% !important; padding: 12px !important; border-radius: 8px !important; word-wrap: break-word !important; white-space: pre-wrap !important; margin: ${msg.isUser ? '0 0 0 auto' : '0 auto 0 0'} !important; background-color: ${msg.isUser ? config.primaryColor : config.secondaryColor} !important; color: ${msg.isUser ? config.textColorUser : config.textColorBot} !important;`;
                    messageDiv.textContent = msg.content;
                    elements.chatContainer.appendChild(messageDiv);
                });
                elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
                initialMessageSent = true;
            }
        }
    }
});

if (elements.formToggle) {
    elements.formToggle.addEventListener('click', () => {
        const isFormHidden = elements.formContainer.style.display === 'none';
        elements.formContainer.style.display = isFormHidden ? 'flex' : 'none';
        elements.chatContainer.style.display = isFormHidden ? 'none' : 'flex';
        elements.inputArea.style.display = isFormHidden ? 'none' : 'flex';
    });
}

function addMessage(content, isUser = false, file = null) {
    if (!elements.chatContainer) return;
    
    const messageDiv = document.createElement('div');
    let userBg = config.primaryColor;
    let userText = '#fff';
    // Si el color principal es muy claro, usa texto oscuro
    if (isUser) {
        // Simple check: si el color es muy claro, texto oscuro
        const hex = userBg.replace('#', '');
        const r = parseInt(hex.substring(0,2), 16);
        const g = parseInt(hex.substring(2,4), 16);
        const b = parseInt(hex.substring(4,6), 16);
        const brightness = (r*299 + g*587 + b*114) / 1000;
        if (brightness > 180) userText = '#222';
    }
    messageDiv.style.cssText = `max-width: 80% !important; padding: 12px !important; border-radius: 8px !important; word-wrap: break-word !important; white-space: pre-wrap !important; margin: ${isUser ? '0 0 0 auto' : '0 auto 0 0'} !important; background-color: ${isUser ? userBg : config.secondaryColor} !important; color: ${isUser ? userText : config.textColorBot} !important;`;
    
    if (file) {
        if (file.mimetype.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = file.path;
            img.style.maxWidth = '100%';
            img.style.borderRadius = '4px';
            messageDiv.appendChild(img);
        } else if (file.mimetype.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = file.path;
            messageDiv.appendChild(audio);
        }
    }
    
    let processedContent = String(content);
    processedContent = processedContent.replace(/(?<!<strong.*?>)\*\*(.*?)\*\*(?!<\/strong>)/g, '<strong>$1</strong>');
    
    const textDiv = document.createElement('div');
    textDiv.innerHTML = processedContent;
    messageDiv.appendChild(textDiv);
    
    elements.chatContainer.appendChild(messageDiv);
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;

    // Guardar en el historial local
    chatHistory.add(content, isUser, file);
}

// Función para actualizar la interfaz según el estado
function updateInterface(isLoading = false) {
    if (elements.fileInput && elements.sendButton && elements.attachButton) {
        const hasFile = elements.fileInput.files.length > 0;
        const hasMessage = elements.messageInput.value.trim().length > 0;
        
        // Actualizar estado de los botones
        elements.sendButton.disabled = isLoading || (!hasFile && !hasMessage);
        elements.attachButton.disabled = isLoading;
        elements.messageInput.disabled = isLoading;
        elements.fileInput.disabled = isLoading;
        
        // Actualizar estilos según el estado
        elements.sendButton.style.opacity = (isLoading || (!hasFile && !hasMessage)) ? '0.5' : '1';
        elements.attachButton.style.opacity = isLoading ? '0.5' : '1';
        elements.messageInput.style.opacity = isLoading ? '0.5' : '1';
        
        // Mostrar/ocultar preview del archivo
        if (hasFile && !isLoading) {
            const file = elements.fileInput.files[0];
            elements.filePreview.style.display = 'block';
            elements.fileName.textContent = file.name;
        } else if (!hasFile || isLoading) {
            elements.filePreview.style.display = 'none';
        }
    }
}

// Manejador para el cambio de archivo
if (elements.fileInput) {
    elements.fileInput.addEventListener('change', () => {
        updateInterface();
    });
}

// Manejador para remover archivo
if (elements.removeFile) {
    elements.removeFile.addEventListener('click', () => {
        elements.fileInput.value = '';
        updateInterface();
    });
}

// Manejador para el input de mensaje
if (elements.messageInput) {
    elements.messageInput.addEventListener('input', () => {
        updateInterface();
    });
}

async function sendMessage() {
    if (!elements.messageInput || !elements.chatContainer) return;
    
    const message = elements.messageInput.value.trim();
    const file = elements.fileInput.files[0];
    
    if (!message && !file) return;
    
    // Actualizar interfaz a estado de carga
    updateInterface(true);
    
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('chatbot_id', config.chatbotId);
    formData.append('message', message);
    
    // Agregar mensaje del usuario
    addMessage(message, true, file ? {
        filename: file.name,
        path: URL.createObjectURL(file),
        mimetype: file.type,
        size: file.size
    } : null);
    
    elements.messageInput.value = '';
    elements.fileInput.value = '';
    
    // Actualizar interfaz después de limpiar inputs
    updateInterface();

    // Crear un div para el visto
    const responseDiv = document.createElement('div');
    responseDiv.style.cssText = `max-width: 80% !important; padding: 12px !important; border-radius: 8px !important; word-wrap: break-word !important; white-space: pre-wrap !important; margin: 0 auto 0 0 !important; background-color: ${config.secondaryColor} !important; color: ${config.textColorBot} !important;`;
    
    try {
        const response = await fetch(config.chatWebhookUrl, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!response.ok) {
            const errorMessage = `Error: ${response.status} - ${data.error || 'Sin detalles'}`;
            responseDiv.textContent = errorMessage;
            elements.chatContainer.appendChild(responseDiv);
            chatHistory.add(errorMessage, false);
            return;
        }
        
        // Mostrar el visto
        responseDiv.textContent = "✓";
        elements.chatContainer.appendChild(responseDiv);
        chatHistory.add("✓", false);

        // Iniciar polling para verificar la respuesta de Make
        let attempts = 0;
        const maxAttempts = 30; // 30 intentos = 30 segundos
        const pollInterval = setInterval(async () => {
            try {
                const statusResponse = await fetch(`${config.chatWebhookUrl}/status?user_id=${userId}&chatbot_id=${config.chatbotId}`);
                const statusData = await statusResponse.json();
                
                if (statusData.processed && statusData.makeResponse) {
                    // Agregar la respuesta de Make
                    addMessage(statusData.makeResponse, false);
                    clearInterval(pollInterval);
                } else if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                }
                attempts++;
            } catch (error) {
                console.error('Error en polling:', error);
                clearInterval(pollInterval);
            }
        }, 1000);

    } catch (error) {
        console.error('Error envío:', error);
        const errorMessage = 'Error de conexión.';
        responseDiv.textContent = errorMessage;
        elements.chatContainer.appendChild(responseDiv);
        chatHistory.add(errorMessage, false);
    } finally {
        // Asegurarse de que la interfaz se actualice después de cualquier resultado
        updateInterface(false);
    }
    
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

if(elements.sendButton) elements.sendButton.addEventListener('click', sendMessage);
if(elements.messageInput) elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Agregar manejador para el botón de adjuntar archivo
if (elements.attachButton) {
    elements.attachButton.addEventListener('click', () => {
        elements.fileInput.click();
    });
}

// Busca el div del footer y aplica el color principal
if (elements.formContainer) {
    const footerDiv = elements.formContainer.querySelector('div[style*="text-align: center"]');
    if (footerDiv) {
        footerDiv.style.backgroundColor = config.primaryColor;
        footerDiv.style.color = '#fff'; // Contraste
        footerDiv.style.borderRadius = '0 0 8px 8px';
        footerDiv.style.margin = '-16px -16px 0 -16px';
        footerDiv.style.padding = '10px 0';
    }
} 