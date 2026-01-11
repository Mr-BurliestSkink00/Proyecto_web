import CONFIG from './config.js';

// Elementos del DOM (Asegúrate de que estos IDs existan en tu HTML)
const chatWindow = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');


if (closeChat) {
    closeChat.addEventListener('click', () => {
        chatWindowContainer.classList.add('hidden');
    });
}
// Historial de conversación para mantener el contexto
let chatHistory = JSON.parse(localStorage.getItem('vestia_chat_history')) || [];

// 1. EL PROMPT DE SISTEMA: Define la personalidad de Akimira
const SYSTEM_PROMPT = `
Eres ${CONFIG.ESTILISTA_NOMBRE}, la estilista experta de la boutique "VestIA". 
Tu objetivo es ayudar a los clientes a encontrar outfits perfectos. 
Reglas:
1. Sé amable, elegante y profesional.
2. Si el usuario pregunta por ropa, sugiere categorías: dresses, shoes, tops, bags.
3. Al final de una recomendación, debes incluir el nombre de la categoría entre corchetes, por ejemplo: [category:womens-dresses].
4. Mantén tus respuestas breves y enfocadas en moda.
5. Si el usuario menciona una ocasión (boda, oficina, deporte), recomienda un estilo específico.
`;

// 2. Función principal para hablar con Gemini
async function fetchGeminiResponse(userMessage) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

    // 1. Preparamos los mensajes: Primero el System Prompt para darle personalidad
    // Luego el historial acumulado y finalmente el mensaje nuevo del usuario.
    const contents = [
        { 
            role: "user", 
            parts: [{ text: SYSTEM_PROMPT }] 
        },
        { 
            role: "model", 
            parts: [{ text: "Entendido. Soy Akimira, tu estilista de VestIA. ¿En qué puedo ayudarte?" }] 
        },
        ...chatHistory, // Mensajes previos guardados en memoria
        { 
            role: "user", 
            parts: [{ text: userMessage }] 
        }
    ];

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        if (!response.ok) throw new Error("Fallo en la respuesta de la API");

        const data = await response.json();
        
        // Validar que la respuesta tenga el formato esperado
        if (data.candidates && data.candidates[0].content) {
            const botResponse = data.candidates[0].content.parts[0].text;
            
            // ACTUALIZAR EL HISTORIAL: Guardar la interacción para la próxima pregunta
            chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
            chatHistory.push({ role: "model", parts: [{ text: botResponse }] });
            
            return botResponse;
        } else {
            throw new Error("Formato de respuesta inesperado");
        }

    } catch (error) {
        console.error("Error en Gemini API:", error);
        return "Lo siento, tuve un pequeño problema con mi catálogo virtual. ¿Podrías repetirme tu consulta?";
    }
}

// 3. Renderizar mensajes en pantalla
function renderMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;
    msgDiv.innerHTML = `<strong>${sender === 'user' ? 'Tú' : 'Akimira'}:</strong> ${text}`;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 4. Manejador del evento de envío
chatForm.addEventListener('submit', async (event) => {
    // 1. detener la recarga de la pagina
    event.preventDefault(); 
    
    const message = chatInput.value.trim();
    
    // 2. Si el mensaje está vacío, no hacemos nada
    if (!message) return;

    // 3. Mostramos el mensaje del usuario en la pantalla
    renderMessage(message, 'user');
    chatInput.value = ""; // Limpiamos el input

    // 4. Llamamos a la IA
    try {
        const response = await fetchGeminiResponse(message);
        renderMessage(response, 'bot');
    } catch (error) {
        console.error("Error al enviar:", error);
    }
});