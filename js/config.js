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
    MODEL_NAME: 'gemini-2.5-flash',
    
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
    ]
};

// Prompt System: Asesor de Moda de Vestia
function getSystemPrompt() {
    return `AQUI DEBERIA IR TU PROMPT PARA LIMITAR AL CHATBOT`;
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

// Exportar funciones
if (typeof window !== 'undefined') {
    window.CHATBOT_CONFIG = CHATBOT_CONFIG;
    window.loadApiKey = loadApiKey;
    window.saveApiKey = saveApiKey;
    window.hasApiKey = hasApiKey;
    window.setModel = setModel;
    window.getNextModel = getNextModel;
    window.getSystemPrompt = getSystemPrompt;
}

