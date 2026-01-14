// ============================================
// CHATBOT CON GEMINI - IMPLEMENTACIÓN
// ============================================

let chatHistory = [];
let responseTimes = [];
let isStreaming = false;
let currentAbortController = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initializeChatbot();
});

// Inicializar chatbot
function initializeChatbot() {
    // Cargar API Key guardada
    const savedKey = loadApiKey();
    if (savedKey) {
        document.getElementById('apiKeyInput').value = savedKey;
        updateApiStatus(true);
        enableChat();
    } else {
        updateApiStatus(false);
    }
    
    // Actualizar visualización del modelo inicial
    updateModelDisplay(CHATBOT_CONFIG.MODEL_NAME);
    
    // Event listeners
    setupEventListeners();
    
    // Cargar historial si existe
    loadChatHistory();
}

// Configurar event listeners
function setupEventListeners() {
    // Guardar API Key
    const saveBtn = document.getElementById('saveApiKey');
    saveBtn.addEventListener('click', handleSaveApiKey);
    
    // Enter en el input de API Key
    const apiKeyInput = document.getElementById('apiKeyInput');
    apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSaveApiKey();
        }
    });
    
    // Toggle visibilidad de API Key
    const toggleVisibility = document.getElementById('toggleVisibility');
    toggleVisibility.addEventListener('click', () => {
        const input = apiKeyInput;
        const icon = toggleVisibility.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
    
    // Enviar mensaje
    const sendButton = document.getElementById('sendButton');
    const chatInput = document.getElementById('chatInput');
    
    sendButton.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Limpiar chat
    const clearBtn = document.getElementById('clearChat');
    clearBtn.addEventListener('click', clearChat);
    
    // Toggle debug panel
    const debugToggle = document.getElementById('debugToggle');
    debugToggle.addEventListener('click', () => {
        const content = document.getElementById('debugContent');
        const chevron = document.getElementById('debugChevron');
        const isVisible = content.style.display !== 'none';
        
        content.style.display = isVisible ? 'none' : 'block';
        chevron.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
    });
}

// Manejar guardado de API Key
function handleSaveApiKey() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        showNotification('Por favor, ingresa una API Key válida', 'error');
        return;
    }
    
    if (saveApiKey(apiKey)) {
        updateApiStatus(true);
        enableChat();
        showNotification('API Key guardada correctamente', 'success');
        // Ocultar el panel de configuración si está visible
        const apiConfig = document.getElementById('apiConfig');
        apiConfig.style.display = 'none';
    } else {
        showNotification('Error al guardar la API Key', 'error');
    }
}

// Actualizar estado de la API
function updateApiStatus(isConfigured) {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    if (isConfigured && hasApiKey()) {
        statusIndicator.className = 'status-indicator active';
        statusText.textContent = 'API Key configurada';
    } else {
        statusIndicator.className = 'status-indicator inactive';
        statusText.textContent = 'API Key no configurada';
    }
}

// Habilitar chat
function enableChat() {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    
    chatInput.disabled = false;
    sendButton.disabled = false;
    chatInput.placeholder = 'Escribe tu mensaje aquí...';
}

// Enviar mensaje
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message || isStreaming) return;
    
    if (!hasApiKey()) {
        showNotification('Por favor, configura tu API Key primero', 'error');
        document.getElementById('apiConfig').style.display = 'block';
        return;
    }
    
    // Agregar mensaje del usuario
    addMessage('user', message);
    chatInput.value = '';
    
    // Mostrar indicador de escritura
    const typingId = showTypingIndicator();
    
    // Registrar tiempo de inicio
    const startTime = Date.now();
    
    try {
        // Crear AbortController para cancelar si es necesario
        currentAbortController = new AbortController();
        
        // Obtener respuesta de Gemini
        const response = await getGeminiResponse(message, currentAbortController.signal);
        
        // Ocultar indicador de escritura
        hideTypingIndicator(typingId);
        
        // Calcular tiempo de respuesta
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        updateStats();
        
        // Agregar respuesta del bot
        addMessage('bot', response);
        
        // Guardar historial
        saveChatHistory();
        
    } catch (error) {
        hideTypingIndicator(typingId);
        
        let errorMessage = 'Lo siento, hubo un error al procesar tu mensaje.';
        
        if (error.name === 'AbortError') {
            errorMessage = 'La solicitud fue cancelada.';
        } else if (error.message) {
            if (error.message.includes('API key') || error.message.includes('API_KEY')) {
                errorMessage = '⚠️ Error: API Key inválida. Por favor, verifica tu configuración.';
                updateApiStatus(false);
            } else if (error.message.includes('quota') || error.message.includes('Quota')) {
                errorMessage = '⏱️ Límite de solicitudes alcanzado. Por favor, intenta más tarde.';
            } else if (error.message.includes('safety') || error.message.includes('Safety')) {
                errorMessage = '🔒 Tu mensaje fue bloqueado por filtros de seguridad.';
            } else {
                errorMessage = `⚠️ ${error.message}`;
            }
        }
        
        addMessage('bot', errorMessage);
        console.error('Error en chatbot:', error);
        
        // Mostrar error en panel de debug
        updateDebugPanel(null, error);
    } finally {
        isStreaming = false;
        currentAbortController = null;
    }
}

// Intentar obtener respuesta con un modelo específico
async function tryModel(modelName, requestBody, abortSignal) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    
    const response = await fetch(
        `${apiUrl}?key=${CHATBOT_CONFIG.GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: abortSignal
        }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
        if (data.error) {
            const errorMsg = data.error.message || 'Error desconocido';
            if (errorMsg.includes('not found') || errorMsg.includes('not supported')) {
                return { success: false, error: 'MODEL_NOT_FOUND', data };
            }
        }
        return { success: false, error: 'API_ERROR', data };
    }
    
    // Verificar respuesta
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        if (data.promptFeedback && data.promptFeedback.blockReason) {
            return { success: false, error: 'SAFETY_BLOCKED', data };
        }
        return { success: false, error: 'INVALID_RESPONSE', data };
    }
    
    // Extraer texto de la respuesta
    const content = data.candidates[0].content;
    if (!content.parts || !content.parts[0] || !content.parts[0].text) {
        return { success: false, error: 'NO_TEXT', data };
    }
    
    return { success: true, text: content.parts[0].text, data };
}

// Obtener respuesta de Gemini con fallback automático
async function getGeminiResponse(message, abortSignal) {
    isStreaming = true;
    updateStreamingIndicator(true);
    
    // Obtener el system prompt
    const systemPrompt = getSystemPrompt();
    
    // Construir historial de conversación
    const contents = [];
    
    // Agregar el historial de conversación existente
    chatHistory.forEach(msg => {
        contents.push({
            role: msg.type === 'user' ? 'user' : 'model',
            parts: [{ text: msg.message }]
        });
    });
    
    // Agregar el nuevo mensaje del usuario con el system prompt reforzado
    // Incluir el system prompt en el mensaje para asegurar que el modelo lo siga
    const userMessageWithContext = `${systemPrompt}\n\nPregunta del usuario: ${message}\n\nRecuerda: Mantén el enfoque en moda y estilo. Si la pregunta no está relacionada con moda, redirige amablemente hacia temas de estilo y vestimenta.`;
    
    contents.push({
        role: 'user',
        parts: [{ text: userMessageWithContext }]
    });
    
    // Construir el request body
    const requestBody = {
        contents: contents,
        generationConfig: CHATBOT_CONFIG.GENERATION_CONFIG,
        safetySettings: CHATBOT_CONFIG.SAFETY_SETTINGS
    };
    
    // Intentar con cada modelo disponible hasta que uno funcione
    let lastError = null;
    let triedModels = [];
    
    for (const modelName of CHATBOT_CONFIG.AVAILABLE_MODELS) {
        try {
            console.log(`Intentando con modelo: ${modelName}`);
            triedModels.push(modelName);
            
            const result = await tryModel(modelName, requestBody, abortSignal);
            
            if (result.success) {
                // ¡Éxito! Actualizar configuración con el modelo que funcionó
                if (CHATBOT_CONFIG.MODEL_NAME !== modelName) {
                    CHATBOT_CONFIG.MODEL_NAME = modelName;
                    CHATBOT_CONFIG.GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
                    showNotification(`Modelo actualizado a: ${modelName}`, 'success');
                    updateModelDisplay(modelName);
                }
                
                // Actualizar panel de debug
                updateDebugPanel(result.data, null);
                
                // Actualizar historial
                chatHistory.push({ type: 'user', message, timestamp: new Date() });
                chatHistory.push({ type: 'bot', message: result.text, timestamp: new Date() });
                
                updateStreamingIndicator(false);
                return result.text;
            } else if (result.error === 'MODEL_NOT_FOUND') {
                // Este modelo no está disponible, intentar el siguiente
                console.warn(`Modelo ${modelName} no disponible, intentando siguiente...`);
                lastError = new Error(`Modelo ${modelName} no disponible`);
                continue;
            } else {
                // Otro tipo de error (API, seguridad, etc.)
                lastError = handleApiError(result.error, result.data);
                break;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }
            console.error(`Error con modelo ${modelName}:`, error);
            lastError = error;
            continue;
        }
    }
    
    // Si llegamos aquí, ningún modelo funcionó
    updateStreamingIndicator(false);
    
    if (lastError) {
        if (lastError.message.includes('not found') || lastError.message.includes('not supported')) {
            throw new Error(`Ninguno de los modelos probados está disponible. Modelos intentados: ${triedModels.join(', ')}`);
        }
        throw lastError;
    }
    
    throw new Error('No se pudo obtener respuesta de ningún modelo disponible');
}

// Manejar errores de la API
function handleApiError(errorType, data) {
    if (data && data.error) {
        const errorMsg = data.error.message || 'Error desconocido';
        
        if (errorMsg.includes('API key') || errorMsg.includes('API_KEY')) {
            return new Error('API Key inválida');
        } else if (errorMsg.includes('quota') || errorMsg.includes('Quota')) {
            return new Error('Límite de solicitudes alcanzado');
        } else if (errorMsg.includes('safety') || errorMsg.includes('Safety')) {
            return new Error('Mensaje bloqueado por filtros de seguridad');
        }
        
        return new Error(`Error en la API: ${errorMsg}`);
    }
    
    if (errorType === 'SAFETY_BLOCKED') {
        return new Error('Mensaje bloqueado por filtros de seguridad');
    }
    
    return new Error('Error desconocido en la API');
}

// Agregar mensaje al chat
function addMessage(type, message) {
    const chatMessages = document.getElementById('chatMessages');
    
    // Remover mensaje de bienvenida si existe
    const welcomeMsg = chatMessages.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = type === 'user' 
        ? '<i class="fas fa-user"></i>' 
        : '<i class="fas fa-robot"></i>';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    // Formatear mensaje (soporte para markdown básico)
    const formattedMessage = formatMessage(message);
    content.innerHTML = formattedMessage;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messageDiv.appendChild(timestamp);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll al final
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Guardar en historial local
    chatHistory.push({ type, message, timestamp: new Date() });
}

// Formatear mensaje (soporte básico para markdown)
function formatMessage(message) {
    // Convertir saltos de línea
    let formatted = message.replace(/\n/g, '<br>');
    
    // Negrita **texto**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Cursiva *texto*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Código `texto`
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    
    return formatted;
}

// Mostrar indicador de escritura
function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingId = 'typing-' + Date.now();
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot-message typing-indicator';
    typingDiv.id = typingId;
    
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return typingId;
}

// Ocultar indicador de escritura
function hideTypingIndicator(typingId) {
    const typingIndicator = document.getElementById(typingId);
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Actualizar indicador de streaming
function updateStreamingIndicator(isStreaming) {
    const indicator = document.getElementById('streamingIndicator');
    if (isStreaming) {
        indicator.style.display = 'inline-flex';
    } else {
        indicator.style.display = 'none';
    }
}

// Actualizar visualización del modelo actual
function updateModelDisplay(modelName) {
    const modelDisplay = document.getElementById('currentModelName');
    if (modelDisplay) {
        // Formatear el nombre del modelo para mostrar
        const displayName = modelName
            .replace('gemini-', 'Gemini ')
            .replace('-', ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        modelDisplay.textContent = displayName;
    }
}

// Limpiar chat
function clearChat() {
    if (isStreaming) {
        if (currentAbortController) {
            currentAbortController.abort();
        }
    }
    
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">
                <i class="fas fa-comments"></i>
            </div>
            <h2>¡Conversación limpiada!</h2>
            <p>Puedes comenzar una nueva conversación.</p>
        </div>
    `;
    
    chatHistory = [];
    localStorage.removeItem(CHATBOT_CONFIG.STORAGE_HISTORY);
    
    showNotification('Chat limpiado', 'success');
}

// Guardar historial
function saveChatHistory() {
    try {
        localStorage.setItem(CHATBOT_CONFIG.STORAGE_HISTORY, JSON.stringify(chatHistory));
    } catch (error) {
        console.error('Error guardando historial:', error);
    }
}

// Cargar historial
function loadChatHistory() {
    try {
        const saved = localStorage.getItem(CHATBOT_CONFIG.STORAGE_HISTORY);
        if (saved) {
            const history = JSON.parse(saved);
            chatHistory = history;
            
            // Restaurar mensajes en la UI
            history.forEach(msg => {
                addMessage(msg.type, msg.message);
            });
        }
    } catch (error) {
        console.error('Error cargando historial:', error);
    }
}

// Actualizar estadísticas
function updateStats() {
    const messagesSent = document.getElementById('messagesSent');
    const avgTime = document.getElementById('avgTime');
    const lastResponseTime = document.getElementById('lastResponseTime');
    
    if (messagesSent) {
        messagesSent.textContent = chatHistory.filter(m => m.type === 'user').length;
    }
    
    if (responseTimes.length > 0 && avgTime) {
        const avg = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
        avgTime.textContent = `${avg}ms`;
    }
    
    if (responseTimes.length > 0 && lastResponseTime) {
        const last = responseTimes[responseTimes.length - 1];
        lastResponseTime.textContent = `${last}ms`;
    }
}

// Actualizar panel de debug
function updateDebugPanel(data, error) {
    const apiResponse = document.getElementById('apiResponse');
    
    if (error) {
        apiResponse.textContent = `Error: ${error.message}\n\n${JSON.stringify(error, null, 2)}`;
        apiResponse.className = 'error';
    } else if (data) {
        apiResponse.textContent = JSON.stringify(data, null, 2);
        apiResponse.className = 'success';
    }
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}