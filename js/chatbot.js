// ============================================
// CHATBOT CON GEMINI - IMPLEMENTACIÓN
// ============================================

let chatHistory = [];
let responseTimes = [];
let isStreaming = false;
let currentAbortController = null;
let selectedImages = [];

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

     // Limpiar imágenes antiguas
    setInterval(cleanupOldImages, 60000); // Cada minuto
    
    // Agregar botón para subir imágenes
    addImageUploadButton();
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

// Agregar botón para subir imágenes
function addImageUploadButton() {
    const chatInputContainer = document.querySelector('.chat-input-container');
    if (!chatInputContainer) return;
    
    // Crear contenedor para botones de imagen
    const imageButtonsContainer = document.createElement('div');
    imageButtonsContainer.className = 'image-buttons-container';
    imageButtonsContainer.style.cssText = `
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
    `;
    
    // Botón para subir imagen
    const uploadButton = document.createElement('button');
    uploadButton.className = 'btn-image-upload';
    uploadButton.innerHTML = '<i class="fas fa-image"></i> Subir imagen';
    uploadButton.title = 'Subir imagen (Máx. 5MB)';
    uploadButton.style.cssText = `
        background: #667eea;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 5px;
    `;
    
    // Input de archivo oculto
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    fileInput.id = 'imageUploadInput';
    
    // Botón para cámara (si está disponible)
    const cameraButton = document.createElement('button');
    cameraButton.className = 'btn-camera';
    cameraButton.innerHTML = '<i class="fas fa-camera"></i> Cámara';
    cameraButton.title = 'Tomar foto';
    cameraButton.style.cssText = uploadButton.style.cssText;
    cameraButton.style.background = '#CB6EEA';
    
    // Event listeners
    uploadButton.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', handleImageUpload);
    
    // Verificar si hay soporte para cámara
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        cameraButton.addEventListener('click', openCamera);
        imageButtonsContainer.appendChild(cameraButton);
    }
     // Agregar elementos al DOM
    imageButtonsContainer.appendChild(uploadButton);
    imageButtonsContainer.appendChild(fileInput);
    
    // Insertar antes del input de texto
    const inputWrapper = chatInputContainer.querySelector('.input-wrapper');
    if (inputWrapper) {
        chatInputContainer.insertBefore(imageButtonsContainer, inputWrapper);
    } else {
        chatInputContainer.prepend(imageButtonsContainer);
    }
        // Contenedor para previsualización de imágenes
    const previewContainer = document.createElement('div');
    previewContainer.className = 'image-preview-container';
    previewContainer.id = 'imagePreviewContainer';
    previewContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;
        max-height: 100px;
        overflow-y: auto;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 4px;
    `;
    
    chatInputContainer.insertBefore(previewContainer, imageButtonsContainer);
}

// Manejar subida de imágenes
function handleImageUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validar tipo de archivo
        if (!CHATBOT_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
            showNotification(`Tipo de archivo no permitido: ${file.type}`, 'error');
            continue;
        }
        
        // Validar tamaño
        if (file.size > CHATBOT_CONFIG.MAX_IMAGE_SIZE) {
            showNotification(`Imagen demasiado grande (Máx. ${CHATBOT_CONFIG.MAX_IMAGE_SIZE / 1024 / 1024}MB)`, 'error');
            continue;
        }
        
        // Procesar imagen
        processAndAddImage(file);
    }
    
    // Limpiar input
    event.target.value = '';
}

// Procesar y agregar imagen
function processAndAddImage(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const imageData = e.target.result;
        
        // Crear ID único para la imagen
        const imageId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Guardar en storage
        saveImageToStorage(imageId, imageData);
        
        // Agregar a imágenes seleccionadas
        selectedImages.push({
            id: imageId,
            data: imageData,
            name: file.name,
            type: file.type
        });
        
        // Mostrar previsualización
        showImagePreview(imageId, imageData, file.name);
        
        // Mostrar notificación
        showNotification(`Imagen "${file.name}" agregada`, 'success');
    };
    
    reader.onerror = function() {
        showNotification('Error al leer la imagen', 'error');
    };
    
    reader.readAsDataURL(file);
}

// Mostrar previsualización de imagen
function showImagePreview(imageId, imageData, fileName) {
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (!previewContainer) return;
    
    const previewItem = document.createElement('div');
    previewItem.className = 'image-preview-item';
    previewItem.dataset.imageId = imageId;
    previewItem.style.cssText = `
        position: relative;
        width: 60px;
        height: 60px;
        border-radius: 4px;
        overflow: hidden;
        border: 2px solid #667eea;
    `;
    
    // Imagen en miniatura
    const img = document.createElement('img');
    img.src = imageData;
    img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
    `;
    img.title = fileName;
    
    // Botón para eliminar
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Eliminar imagen';
    removeBtn.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    `;
    
    removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        removeImage(imageId);
    });
    
    previewItem.appendChild(img);
    previewItem.appendChild(removeBtn);
    previewContainer.appendChild(previewItem);
}

// Eliminar imagen
function removeImage(imageId) {
    // Remover de array
    selectedImages = selectedImages.filter(img => img.id !== imageId);
    
    // Remover del DOM
    const previewItem = document.querySelector(`[data-image-id="${imageId}"]`);
    if (previewItem) {
        previewItem.remove();
    }
    
    // Limpiar storage si no hay más referencias
    setTimeout(() => {
        const images = getStoredImages();
        if (images[imageId]) {
            delete images[imageId];
            localStorage.setItem(CHATBOT_CONFIG.STORAGE_IMAGES, JSON.stringify(images));
        }
    }, 1000);
}

// Abrir cámara
function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('Cámara no disponible en este dispositivo', 'error');
        return;
    }
    
    // Crear modal para la cámara
    const cameraModal = document.createElement('div');
    cameraModal.className = 'camera-modal';
    cameraModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    
    const video = document.createElement('video');
    video.autoplay = true;
    video.style.cssText = `
        max-width: 90%;
        max-height: 70%;
        border-radius: 8px;
    `;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        margin-top: 20px;
        display: flex;
        gap: 20px;
    `;
    
    const captureBtn = document.createElement('button');
    captureBtn.innerHTML = '<i class="fas fa-camera"></i> Tomar foto';
    captureBtn.style.cssText = `
        background: #667eea;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i> Cancelar';
    closeBtn.style.cssText = captureBtn.style.cssText;
    closeBtn.style.background = '#6c757d';
    
    let stream = null;
    
    // Iniciar cámara
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(mediaStream) {
            stream = mediaStream;
            video.srcObject = stream;
        })
        .catch(function(err) {
            showNotification('Error al acceder a la cámara: ' + err.message, 'error');
            cameraModal.remove();
        });
    
    // Capturar foto
    captureBtn.addEventListener('click', function() {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0);
        
        // Convertir a blob
        canvas.toBlob(function(blob) {
            if (blob) {
                const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
                processAndAddImage(file);
            }
        }, 'image/jpeg', 0.8);
        
        // Detener stream y cerrar modal
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        cameraModal.remove();
    });
    
    // Cerrar modal
    closeBtn.addEventListener('click', function() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        cameraModal.remove();
    });
    
    // Montar modal
    buttonContainer.appendChild(captureBtn);
    buttonContainer.appendChild(closeBtn);
    cameraModal.appendChild(video);
    cameraModal.appendChild(buttonContainer);
    document.body.appendChild(cameraModal);
}

// Modificar sendMessage para soportar imágenes
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if ((!message && selectedImages.length === 0) || isStreaming) return;
    
    if (!hasApiKey()) {
        showNotification('Por favor, configura tu API Key primero', 'error');
        document.getElementById('apiConfig').style.display = 'block';
        return;
    }
    
    // Agregar mensaje del usuario con imágenes
    addMessageWithImages('user', message);
    chatInput.value = '';
    
    // Mostrar indicador de escritura
    const typingId = showTypingIndicator();
    
    // Registrar tiempo de inicio
    const startTime = Date.now();
    
    try {
        // Crear AbortController
        currentAbortController = new AbortController();
        
        // Obtener respuesta de Gemini (con imágenes si las hay)
        const response = await getGeminiResponseWithImages(message, currentAbortController.signal);
        
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
        
        // Limpiar imágenes seleccionadas
        clearSelectedImages();
        
    } catch (error) {
        hideTypingIndicator(typingId);
        
        let errorMessage = 'Lo siento, hubo un error al procesar tu mensaje.';
        
        if (error.name === 'AbortError') {
            errorMessage = 'La solicitud fue cancelada.';
        } else if (error.message) {
            if (error.message.includes('API key')) {
                errorMessage = '⚠️ Error: API Key inválida.';
                updateApiStatus(false);
            } else if (error.message.includes('image') || error.message.includes('Image')) {
                errorMessage = '⚠️ Este modelo no soporta análisis de imágenes. Intenta con Gemini 1.5 o superior.';
            } else {
                errorMessage = `⚠️ ${error.message}`;
            }
        }
        
        addMessage('bot', errorMessage);
        console.error('Error en chatbot:', error);
        
        updateDebugPanel(null, error);
    } finally {
        isStreaming = false;
        currentAbortController = null;
    }
}

// Agregar mensaje con imágenes
function addMessageWithImages(type, message) {
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
    
    // Agregar texto del mensaje
    if (message) {
        const textDiv = document.createElement('div');
        textDiv.innerHTML = formatMessage(message);
        content.appendChild(textDiv);
    }
    
    // Agregar imágenes si las hay
    if (selectedImages.length > 0) {
        const imagesDiv = document.createElement('div');
        imagesDiv.className = 'message-images';
        imagesDiv.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        `;
        
        selectedImages.forEach(img => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'message-image-container';
            imgContainer.style.cssText = `
                width: 80px;
                height: 80px;
                border-radius: 4px;
                overflow: hidden;
                border: 1px solid #dee2e6;
            `;
            
            const imgElement = document.createElement('img');
            imgElement.src = img.data;
            imgElement.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
            `;
            imgElement.title = img.name;
            
            imgContainer.appendChild(imgElement);
            imagesDiv.appendChild(imgContainer);
        });
        
        content.appendChild(imagesDiv);
    }
    
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
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Guardar en historial local
    chatHistory.push({ 
        type, 
        message, 
        images: selectedImages.map(img => ({
            id: img.id,
            name: img.name,
            type: img.type
        })),
        timestamp: new Date() 
    });
}

// Obtener respuesta de Gemini con imágenes
async function getGeminiResponseWithImages(message, abortSignal) {
    isStreaming = true;
    updateStreamingIndicator(true);
    
    // Verificar si el modelo soporta imágenes
    if (selectedImages.length > 0 && !supportsImages()) {
        throw new Error('Este modelo no soporta análisis de imágenes. Selecciona Gemini 1.5 o superior.');
    }
    
    const systemPrompt = getSystemPrompt();
    
    // Construir contents para la API
    const contents = [];
    
    // Agregar historial de conversación
    chatHistory.forEach(msg => {
        const contentItem = {
            role: msg.type === 'user' ? 'user' : 'model',
            parts: []
        };
        
        // Agregar texto
        if (msg.message) {
            contentItem.parts.push({ text: msg.message });
        }
        
        // Agregar imágenes si existen
        if (msg.images && msg.images.length > 0 && msg.type === 'user') {
            msg.images.forEach(img => {
                const storedImages = getStoredImages();
                if (storedImages[img.id]) {
                    // Extraer base64 data
                    const base64Data = storedImages[img.id].data.split(',')[1];
                    contentItem.parts.push({
                        inline_data: {
                            mime_type: img.type,
                            data: base64Data
                        }
                    });
                }
            });
        }
        
        if (contentItem.parts.length > 0) {
            contents.push(contentItem);
        }
    });
    
    // Agregar el nuevo mensaje con imágenes
    const newMessageParts = [];
    
    // Agregar system prompt y texto del mensaje
    const fullMessage = `${systemPrompt}\n\nPregunta del usuario: ${message}`;
    newMessageParts.push({ text: fullMessage });
    
    // Agregar imágenes si las hay
    if (selectedImages.length > 0) {
        selectedImages.forEach(img => {
            // Extraer base64 data (remover el prefijo data:image/...;base64,)
            const base64Data = img.data.split(',')[1];
            newMessageParts.push({
                inline_data: {
                    mime_type: img.type,
                    data: base64Data
                }
            });
        });
    }
    
    contents.push({
        role: 'user',
        parts: newMessageParts
    });
    
    // Construir request body
    const requestBody = {
        contents: contents,
        generationConfig: CHATBOT_CONFIG.GENERATION_CONFIG,
        safetySettings: CHATBOT_CONFIG.SAFETY_SETTINGS
    };
    
    // Intentar con cada modelo
    let lastError = null;
    let triedModels = [];
    
    for (const modelName of CHATBOT_CONFIG.AVAILABLE_MODELS) {
        try {
            console.log(`Intentando con modelo: ${modelName}`);
            triedModels.push(modelName);
            
            const result = await tryModelWithImages(modelName, requestBody, abortSignal);
            
            if (result.success) {
                if (CHATBOT_CONFIG.MODEL_NAME !== modelName) {
                    CHATBOT_CONFIG.MODEL_NAME = modelName;
                    CHATBOT_CONFIG.GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
                    showNotification(`Modelo actualizado a: ${modelName}`, 'success');
                    updateModelDisplay(modelName);
                }
                
                updateDebugPanel(result.data, null);
                
                chatHistory.push({ 
                    type: 'user', 
                    message, 
                    images: selectedImages.map(img => ({
                        id: img.id,
                        name: img.name,
                        type: img.type
                    })),
                    timestamp: new Date() 
                });
                chatHistory.push({ 
                    type: 'bot', 
                    message: result.text, 
                    timestamp: new Date() 
                });
                
                updateStreamingIndicator(false);
                return result.text;
            } else {
                lastError = handleApiError(result.error, result.data);
                if (result.error === 'MODEL_NOT_FOUND') {
                    continue;
                } else {
                    break;
                }
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
    
    updateStreamingIndicator(false);
    
    if (lastError) {
        throw lastError;
    }
    
    throw new Error('No se pudo obtener respuesta');
}

// Función para probar modelo con imágenes
async function tryModelWithImages(modelName, requestBody, abortSignal) {
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
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        if (data.promptFeedback && data.promptFeedback.blockReason) {
            return { success: false, error: 'SAFETY_BLOCKED', data };
        }
        return { success: false, error: 'INVALID_RESPONSE', data };
    }
    
    const content = data.candidates[0].content;
    if (!content.parts || !content.parts[0] || !content.parts[0].text) {
        return { success: false, error: 'NO_TEXT', data };
    }
    
    return { success: true, text: content.parts[0].text, data };
}

// Limpiar imágenes seleccionadas
function clearSelectedImages() {
    selectedImages = [];
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
}

// Modificar clearChat para limpiar imágenes
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
    selectedImages = [];
    
    // Limpiar preview
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
    
    localStorage.removeItem(CHATBOT_CONFIG.STORAGE_HISTORY);
    
    showNotification('Chat limpiado', 'success');
}
