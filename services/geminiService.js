// services/geminiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error(
    "⛔ ERROR: La variable de entorno GEMINI_API_KEY no está definida."
  );
  process.exit(1); // Salir de la aplicación si la clave no está presente
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Puedes probar con "gemini-pro" si 1.5-flash da problemas o viceversa.

const MAX_HISTORIAL_GEMINI = 10; // Número de mensajes a enviar a Gemini para contexto (pares de user/model)

/**
 * Obtiene una respuesta de Gemini para un mensaje de usuario.
 * @param {string} userMessage - El mensaje actual del usuario.
 * @param {object} enterpriseData - Datos del emprendimiento.
 * @param {Array<object>} historialConversacion - Array de objetos de historial en formato { role: "user"|"model", parts: [{ text: "..." }] }.
 * @returns {Promise<string>} La respuesta generada por Gemini.
 */
async function getGeminiResponse(userMessage, enterpriseData, historialConversacion) {
    try {
        const {
            id, 
            nombre, 
            nombreNegocio, 
            rubro = 'general',
            descripcion = 'No se proporcionó descripción.',
            telefono,
            mail, // Mail de LOGIN/REGISTRO del usuario
            mailContacto = [], // <--- ¡AHORA ES UN ARRAY POR DEFECTO!
            horariosAtencion = 'Lunes a Viernes de 9 a 18 hs.',
            direccion = 'Consultar ubicación exacta',
            urlReserva, 
            enlacesUtiles = {}, 
            configChatbot = {} 
        } = enterpriseData;

        const {
            nombreChatbot = 'Asistente Virtual',
            personalidad = 'amigable y profesional',
            ejemplosModismos = [],
            cantidadMaximaEmojis = 2 
        } = configChatbot;

        const linkWeb = enlacesUtiles.web || 'no disponible';
        const linkFacebook = enlacesUtiles.facebook || 'no disponible';
        const linkInstagram = enlacesUtiles.instagram || 'no disponible';

        const nombreParaChatbot = nombreNegocio || nombre || "tu emprendimiento";

        // Lógica para mostrar múltiples emails o el email de login
        let emailsParaChatbot = 'No especificado';
        if (Array.isArray(mailContacto) && mailContacto.length > 0) {
            emailsParaChatbot = mailContacto.join(', '); // Une los correos con coma
        } else if (mail) {
            emailsParaChatbot = mail; // Fallback al mail de login si no hay mails de contacto
        }

        // Construir la instrucción inicial para Gemini
        const initialSystemInstruction = `
            Eres un asistente virtual de IA llamado '${nombreChatbot}'.
            Trabajas para el emprendimiento '${nombreParaChatbot}', cuyo rubro es '${rubro}'.
            Aquí tienes una descripción detallada del negocio:
            "${descripcion}"

            Información de contacto y operativa:
            - Horarios de atención: ${horariosAtencion}
            - Dirección: ${direccion}
            - Teléfono: ${telefono || 'No especificado'}
            - Email(s) de contacto: ${emailsParaChatbot} 
            ${urlReserva ? `- Enlace para reservas: ${urlReserva}` : ''}
            - Link Web: ${linkWeb}
            - Link Facebook: ${linkFacebook}
            ${linkInstagram !== 'no disponible' ? `- Link Instagram: ${linkInstagram}` : ''}

            Tu personalidad y estilo de comunicación deben ser los siguientes:
            "${personalidad}"
            ${ejemplosModismos.length > 0 ? `Incorpora estos modismos suavemente: ${ejemplosModismos.join(', ')}.` : ''}
            No uses más de ${cantidadMaximaEmojis} emojis por respuesta.
            Siempre responde en español.
            Solo responde preguntas directamente relacionadas con los servicios y la información proporcionada sobre '${nombreParaChatbot}'. Si la pregunta no está relacionada, amablemente indica que no puedes ayudar con ese tema.
            Si el usuario pregunta por "turnos", "reservas" o "citas", **no intentes agendarlos tú**. En su lugar, redirígelos a la función de manejo de turnos que el sistema tiene configurada (menciona que se le guiará para ello).
            Evita inventar información. Si no sabes algo, dilo.
            Ofrece ser útil y pregunta si hay algo más en lo que puedas asistir al cliente.
        `;

        const geminiHistory = historialConversacion.slice(-MAX_HISTORIAL_GEMINI * 2).map(item => {
            if (item && item.role && Array.isArray(item.parts) && item.parts.length > 0 && item.parts[0].text) {
                return {
                    role: item.role,
                    parts: [{ text: String(item.parts[0].text) }]
                };
            }
            return null;
        }).filter(item => item !== null);

        const contextualizedHistory = [{
            role: "user",
            parts: [{ text: initialSystemInstruction }]
        }, {
            role: "model",
            parts: [{ text: "¡Hola! ¿En qué puedo ayudarte hoy?" }]
        }, ...geminiHistory];

        const chat = model.startChat({
            history: contextualizedHistory,
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const result = await chat.sendMessage(userMessage);
        const response = await result.response;
        const text = response.text();

        return text;

    } catch (error) {
        console.error("Error al obtener respuesta de Gemini:", error);
        if (error.status === 400) {
            console.error("Detalles del error 400 de Gemini:", error.errorDetails);
        }
        throw new Error("Lo siento, no pude generar una respuesta en este momento. Por favor, intenta de nuevo más tarde.");
    }
}

module.exports = {
  getGeminiResponse,
};
