const CONFIG = {
    // CONFIGURACIÓN DE GOOGLE GEMINI IA
    GEMINI_API_KEY: "AIzaSyAsQJs-gMIIeFmiXFOubI9QqYTOxOPlowc", 
    GEMINI_MODEL: "gemini-1.5-flash", // Modelo optimizado para velocidad y costo
    
    // CONFIGURACIÓN DE PRODUCTOS (DummyJSON)
    PRODUCTS_API_URL: "https://dummyjson.com/products",
    
    // CONFIGURACIÓN DEL SISTEMA "VestIA"
    APP_NAME: "VestIA Boutique",
    ESTILISTA_NOMBRE: "Edna Modas", // El nombre de la ia
    
    // PREFERENCIAS POR DEFECTO
    DEFAULT_PAGE_SIZE: 9, // Requerimiento: Mínimo 9 productos por página
};

// Exportar para que otros archivos (chatbot.js, products.js) puedan usarlo
export default CONFIG;