// ============================================
// CONFIGURACIÓN DEL CHATBOT DE PRUEBA
// ============================================

const CHATBOT_CONFIG = {
    // API Configuration
    // El usuario proporcionará su propia API key
    GEMINI_API_KEY: '', // Se guardará en localStorage
    
    // URL de la API de Gemini
    // Modelos disponibles (ordenados de más reciente a más antiguo):
    // - gemini-2.5-flash (recomendado - versión más reciente, rápido y eficiente)
    // - gemini-2.5-pro (más potente pero más lento)
    // - gemini-2.0-flash-exp (experimental, puede no estar disponible)
    // Nota: Las versiones 1.5 y anteriores están deprecated
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    
    // Storage Keys
    STORAGE_KEY: 'gemini_chatbot_api_key',
    STORAGE_HISTORY: 'gemini_chatbot_history',
    
    // Configuración del modelo
    MODEL_NAME: 'Edna Modas ',
    
    // Modelos alternativos disponibles (ordenados por prioridad)
    // El sistema intentará automáticamente estos modelos si el principal falla
    AVAILABLE_MODELS: [
        'gemini-2.5-flash',      // Primera opción: rápido y eficiente
        'gemini-2.5-pro',         // Segunda opción: más potente
        'gemini-2.0-flash-exp',   // Tercera opción: experimental
        'gemini-1.5-flash',      // Fallback: versión anterior (puede estar deprecated)
        'gemini-1.5-pro'         // Último recurso
    ],
    
    // Configuración de generación
    GENERATION_CONFIG: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
    },
    
    // Configuración de seguridad
    SAFETY_SETTINGS: [
        {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
    ],

     // imagenes
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB máximo
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    STORAGE_IMAGES: 'gemini_chatbot_images',
    
    // Configuración para procesamiento de imágenes
    IMAGE_PROCESSING: {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8
    }

};

// Prompt System: Asesor de Moda de Vestia
function getSystemPrompt() {
    return `Eres Edna Modas, una asesora de moda especializada en Vestia. 
Tu propósito es ayudar a los usuarios con recomendaciones de moda, combinaciones de ropa, 
estilos y consejos de vestimenta.

CUANDO RECIBAS IMÁGENES:
1. Analiza las prendas de vestir, colores, estilos y accesorios
2. Da recomendaciones específicas basadas en lo que ves
3. Sugiere combinaciones con otras prendas
4. Identifica el estilo (casual, formal, deportivo, etc.)
5. Recomienda accesorios que complementen
6. Si es una foto de una persona, analiza su estilo actual y sugiere mejoras

REGLAS IMPORTANTES:
1. SOLO responde preguntas relacionadas con moda, estilo, ropa, accesorios y vestimenta
2. Si te envían imágenes que no son de moda, responde amablemente:
   "Veo que has compartido una imagen, pero como tu asesora de moda, solo puedo ayudarte con análisis de prendas y estilo. ¿Tienes alguna prenda que quieras que analice?"
3. Mantén un tono amigable, profesional y constructivo
4. Sé específico en tus recomendaciones
5. Relaciona siempre tus respuestas con moda y estilo personal`;
}

// Cargar API Key desde localStorage
function loadApiKey() {
    const savedKey = localStorage.getItem(CHATBOT_CONFIG.STORAGE_KEY);
    if (savedKey) {
        CHATBOT_CONFIG.GEMINI_API_KEY = savedKey;
        return savedKey;
    }
    return null;
}

// Guardar API Key en localStorage
function saveApiKey(apiKey) {
    if (apiKey && apiKey.trim() !== '') {
        localStorage.setItem(CHATBOT_CONFIG.STORAGE_KEY, apiKey.trim());
        CHATBOT_CONFIG.GEMINI_API_KEY = apiKey.trim();
        return true;
    }
    return false;
}

// Verificar si hay API Key configurada
function hasApiKey() {
    return CHATBOT_CONFIG.GEMINI_API_KEY && CHATBOT_CONFIG.GEMINI_API_KEY.trim() !== '';
}

// Cambiar modelo (útil si el modelo actual no está disponible)
function setModel(modelName) {
    if (CHATBOT_CONFIG.AVAILABLE_MODELS.includes(modelName)) {
        CHATBOT_CONFIG.MODEL_NAME = modelName;
        CHATBOT_CONFIG.GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
        return true;
    }
    return false;
}

// Obtener el siguiente modelo alternativo
function getNextModel(currentModel) {
    const currentIndex = CHATBOT_CONFIG.AVAILABLE_MODELS.indexOf(currentModel);
    if (currentIndex >= 0 && currentIndex < CHATBOT_CONFIG.AVAILABLE_MODELS.length - 1) {
        return CHATBOT_CONFIG.AVAILABLE_MODELS[currentIndex + 1];
    }
    return null;
}

// Función para verificar si Gemini soporta imágenes
function supportsImages() {
    // Gemini 1.5 y 2.0+ soportan imágenes
    return CHATBOT_CONFIG.MODEL_NAME.includes('1.5') || 
           CHATBOT_CONFIG.MODEL_NAME.includes('2.0') ||
           CHATBOT_CONFIG.MODEL_NAME.includes('2.5');
}

// Guardar imagen en localStorage
function saveImageToStorage(imageId, imageData) {
    try {
        const images = getStoredImages();
        images[imageId] = {
            data: imageData,
            timestamp: new Date().toISOString(),
            size: imageData.length
        };
        localStorage.setItem(CHATBOT_CONFIG.STORAGE_IMAGES, JSON.stringify(images));
        return true;
    } catch (error) {
        console.error('Error guardando imagen:', error);
        return false;
    }
}

// Obtener imágenes almacenadas
function getStoredImages() {
    try {
        const stored = localStorage.getItem(CHATBOT_CONFIG.STORAGE_IMAGES);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        return {};
    }
}

// Eliminar imagen antigua
function cleanupOldImages(maxImages = 50) {
    const images = getStoredImages();
    const imageIds = Object.keys(images);
    
    if (imageIds.length > maxImages) {
        // Ordenar por timestamp y eliminar las más antiguas
        const sorted = imageIds.sort((a, b) => 
            new Date(images[a].timestamp) - new Date(images[b].timestamp)
        );
        
        sorted.slice(0, imageIds.length - maxImages).forEach(id => {
            delete images[id];
        });
        
        localStorage.setItem(CHATBOT_CONFIG.STORAGE_IMAGES, JSON.stringify(images));
    }
}


// Exportar funciones
if (typeof window !== 'undefined') {
    window.CHATBOT_CONFIG = CHATBOT_CONFIG;
    window.loadApiKey = loadApiKey;
    window.saveApiKey = saveApiKey;
    window.hasApiKey = hasApiKey;
    window.setModel = setModel;
    window.getNextModel = getNextModel;
    window.getSystemPrompt = getSystemPrompt;
    window.supportsImages = supportsImages;
    window.saveImageToStorage = saveImageToStorage;
    window.getStoredImages = getStoredImages;
    window.cleanupOldImages = cleanupOldImages;
}




