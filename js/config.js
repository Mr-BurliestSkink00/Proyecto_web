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
    },


    PRODUCTS_API: 'https://dummyjson.com/products',
    PRODUCTS_STORAGE_KEY: 'vestia_products_cache',
    PRODUCTS_CACHE_DURATION: 30 * 60 * 1000, // 30 minutos
    
    // Categorías de productos disponibles
    PRODUCT_CATEGORIES: {
        'womens-dresses': ['dresses', 'dress', 'vestido', 'vestidos', 'falda', 'faldas'],
        'womens-shoes': ['shoes', 'zapatos', 'zapatillas', 'sneakers', 'tacones', 'sandals'],
        'tops': ['tops', 'blusas', 'camisetas', 'shirts', 'blouses', 'remeras'],
        'womens-bags': ['bags', 'bolsos', 'handbags', 'mochilas', 'purses'],
        'womens-jewellery': ['jewelry', 'joyas', 'collares', 'aretes', 'anillos'],
        'mens-shirts': ['shirts', 'camisas', 'polos', 'polo shirts'],
        'mens-shoes': ['shoes', 'zapatos', 'tenis', 'mocasines'],
        'mens-watches': ['watches', 'relojes', 'smartwatch'],
        'womens-watches': ['watches', 'relojes', 'smartwatch'],
        'sunglasses': ['sunglasses', 'gafas', 'lentes', 'gafas de sol']
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

TIENES ACCESO A UN CATÁLOGO DE PRODUCTOS:
Cuando el usuario pida recomendaciones específicas, puedes:
1. Sugerir productos de nuestro catálogo
2. Mencionar características específicas de productos
3. Recomendar combinaciones basadas en productos disponibles
4. Indicar precios y disponibilidad

FORMATO DE RESPUESTAS:
- Si el usuario pide recomendaciones generales, da consejos de estilo
- Si pide productos específicos, menciona opciones de nuestro catálogo
- Siempre mantén un tono amigable y profesional
- Incluye detalles como colores, materiales y ocasiones de uso

CATEGORÍAS DISPONIBLES:
- Vestidos, Blusas, Zapatos, Bols

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

// Obtener productos del API
async function fetchProducts(category = 'all', limit = 10) {
    try {
        let url = CHATBOT_CONFIG.PRODUCTS_API;
        
        if (category !== 'all') {
            url += `/category/${category}`;
        }
        
        url += `?limit=${limit}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error API: ${response.status}`);
        
        const data = await response.json();
        return data.products || [];
        
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

// Buscar productos por término
async function searchProducts(query, limit = 10) {
    try {
        const response = await fetch(`${CHATBOT_CONFIG.PRODUCTS_API}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        if (!response.ok) throw new Error(`Error API: ${response.status}`);
        
        const data = await response.json();
        return data.products || [];
        
    } catch (error) {
        console.error('Error searching products:', error);
        return [];
    }
}

// Obtener producto específico por ID
async function getProductById(id) {
    try {
        const response = await fetch(`${CHATBOT_CONFIG.PRODUCTS_API}/${id}`);
        if (!response.ok) throw new Error(`Error API: ${response.status}`);
        
        return await response.json();
        
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

// Analizar preferencias del usuario desde el mensaje
function analyzeUserPreferences(message) {
    const preferences = {
        category: 'all',
        priceRange: { min: 0, max: 1000 },
        colors: [],
        styles: [],
        keywords: []
    };
    
    const messageLower = message.toLowerCase();
    
    // Detectar categorías
    for (const [category, keywords] of Object.entries(CHATBOT_CONFIG.PRODUCT_CATEGORIES)) {
        if (keywords.some(keyword => messageLower.includes(keyword))) {
            preferences.category = category;
            break;
        }
    }
    
    // Detectar colores
    const colorKeywords = {
        rojo: 'red',
        azul: 'blue',
        verde: 'green',
        negro: 'black',
        blanco: 'white',
        rosado: 'pink',
        amarillo: 'yellow',
        morado: 'purple',
        gris: 'gray',
        marron: 'brown'
    };
    
    for (const [esColor, enColor] of Object.entries(colorKeywords)) {
        if (messageLower.includes(esColor) || messageLower.includes(enColor)) {
            preferences.colors.push(enColor);
        }
    }
    
    // Detectar estilos
    if (messageLower.includes('formal') || messageLower.includes('elegant')) {
        preferences.styles.push('formal');
    }
    if (messageLower.includes('casual') || messageLower.includes('informal')) {
        preferences.styles.push('casual');
    }
    if (messageLower.includes('deportivo') || messageLower.includes('sport')) {
        preferences.styles.push('sport');
    }
    
    // Extraer palabras clave
    const words = messageLower.split(' ');
    preferences.keywords = words.filter(word => 
        word.length > 3 && 
        !['quiero', 'necesito', 'busco', 'recomienda', 'recomendación'].includes(word)
    );
    
    return preferences;
}

// Filtrar productos por preferencias
function filterProductsByPreferences(products, preferences) {
    return products.filter(product => {
        // Filtrar por categoría
        if (preferences.category !== 'all' && product.category) {
            const productCategory = product.category.toLowerCase();
            const targetCategory = preferences.category.replace('womens-', '').replace('mens-', '');
            if (!productCategory.includes(targetCategory)) {
                return false;
            }
        }
        
        // Filtrar por precio
        if (product.price < preferences.priceRange.min || product.price > preferences.priceRange.max) {
            return false;
        }
        
        // Filtrar por colores (si se especificaron)
        if (preferences.colors.length > 0 && product.color) {
            const productColor = product.color.toLowerCase();
            if (!preferences.colors.some(color => productColor.includes(color))) {
                return false;
            }
        }
        
        // Filtrar por palabras clave en título o descripción
        if (preferences.keywords.length > 0) {
            const productText = (product.title + ' ' + product.description).toLowerCase();
            if (!preferences.keywords.some(keyword => productText.includes(keyword))) {
                return false;
            }
        }
        
        return true;
    });
}

// Generar recomendaciones de productos
async function generateProductRecommendations(userMessage, maxRecommendations = 3) {
    // Analizar preferencias del usuario
    const preferences = analyzeUserPreferences(userMessage);
    
    // Obtener productos
    let products = [];
    
    if (preferences.category !== 'all') {
        products = await fetchProducts(preferences.category, 20);
    } else {
        products = await fetchProducts('all', 20);
    }
    
    // Si no hay suficientes productos en la categoría específica, buscar por palabras clave
    if (products.length < 5 && preferences.keywords.length > 0) {
        const keywordResults = await searchProducts(preferences.keywords.join(' '), 20);
        products = [...products, ...keywordResults];
        
        // Eliminar duplicados
        const seenIds = new Set();
        products = products.filter(product => {
            if (seenIds.has(product.id)) return false;
            seenIds.add(product.id);
            return true;
        });
    }
    
    // Filtrar por preferencias
    let filteredProducts = filterProductsByPreferences(products, preferences);
    
    // Si no hay productos filtrados, usar todos
    if (filteredProducts.length === 0) {
        filteredProducts = products.slice(0, maxRecommendations);
    }
    
    // Ordenar por relevancia (rating, reviews, etc.)
    filteredProducts.sort((a, b) => {
        // Priorizar productos con mejor rating
        if (b.rating && a.rating) return b.rating - a.rating;
        // Priorizar productos con más reviews
        if (b.reviewCount && a.reviewCount) return b.reviewCount - a.reviewCount;
        // Priorizar productos más baratos
        return a.price - b.price;
    });
    
    // Tomar las mejores recomendaciones
    return filteredProducts.slice(0, maxRecommendations);
}

// Formatear recomendación para mostrar
function formatProductRecommendation(product) {
    return {
        id: product.id,
        title: product.title,
        description: product.description,
        price: `$${product.price}`,
        discount: product.discountPercentage ? `${product.discountPercentage}% OFF` : null,
        rating: product.rating ? `⭐ ${product.rating}/5` : null,
        image: product.thumbnail || product.images?.[0],
        category: product.category,
        brand: product.brand,
        stock: product.stock,
        link: `#product-${product.id}`
    };
}

// Crear mensaje con recomendaciones
function createRecommendationsMessage(products, userPreferences) {
    if (products.length === 0) {
        return "No encontré productos que coincidan con tus preferencias. ¿Podrías ser más específico sobre lo que buscas?";
    }
    
    let message = "✨ **Encontré estas recomendaciones para ti:**\n\n";
    
    products.forEach((product, index) => {
        const formatted = formatProductRecommendation(product);
        
        message += `**${index + 1}. ${formatted.title}**\n`;
        message += `   ${formatted.description.substring(0, 100)}...\n`;
        message += `   💰 **Precio:** ${formatted.price}`;
        if (formatted.discount) message += ` (${formatted.discount})`;
        if (formatted.rating) message += ` | ${formatted.rating}`;
        message += `\n   🏷️ **Categoría:** ${formatted.category}`;
        if (formatted.brand) message += ` | **Marca:** ${formatted.brand}`;
        message += `\n   📦 **Disponibles:** ${formatted.stock} unidades\n\n`;
    });
    
    message += "¿Te gustaría ver más detalles de algún producto en particular?";
    
    return message;
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
    window.fetchProducts = fetchProducts;
    window.searchProducts = searchProducts;
    window.getProductById = getProductById;
    window.generateProductRecommendations = generateProductRecommendations;
    window.formatProductRecommendation = formatProductRecommendation;
    window.createRecommendationsMessage = createRecommendationsMessage;
    window.analyzeUserPreferences = analyzeUserPreferences;
}