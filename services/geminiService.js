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
async function getGeminiResponse(
  userMessage,
  enterpriseData,
  historialConversacion
) {
  try {
    const fullPrompt = `Eres un asistente virtual para el emprendimiento "${
      enterpriseData.nombre
    }". Su rubro es "${
      enterpriseData.rubro || "general"
    }" y su descripción es: "${
      enterpriseData.descripcion || "No se proporcionó descripción."
    }". Siempre responde en español y sé amigable. No respondas preguntas que no estén relacionadas con el emprendimiento. Si el usuario pregunta por "turnos" o "reservas", redirígelo a la función de manejo de turnos. Si te hacen una pregunta que está claramente fuera del alcance de la información proporcionada del negocio, amablemente indica que no puedes ayudar con eso.

        Este es el mensaje del usuario: "${userMessage}"`;

    // Normalizar y limitar el historial para Gemini
    // Aseguramos que el historial sea un array de objetos { role: string, parts: [{ text: string }] }
    const geminiHistory = historialConversacion
      .slice(-MAX_HISTORIAL_GEMINI * 2)
      .map((item) => {
        if (
          item &&
          item.role &&
          Array.isArray(item.parts) &&
          item.parts.length > 0 &&
          item.parts[0].text
        ) {
          return {
            role: item.role,
            parts: [{ text: String(item.parts[0].text) }], // Asegura que 'text' sea string y no tenga anidaciones
          };
        }
        return null; // Si el elemento no tiene el formato esperado, se ignora
      })
      .filter((item) => item !== null); // Eliminar elementos nulos

    // Añadir el prompt inicial como un mensaje del sistema si aún no está presente
    // La API de Gemini no tiene un "system" role directo para chat. Se incorpora en el primer mensaje de usuario o en el historial.
    // Aquí lo haremos parte del historial para el contexto.
    // Se puede considerar un "primer mensaje" simulado o añadir al historial de forma programática.
    // Para este caso, ya lo tenemos en fullPrompt, que será manejado implícitamente por el chat.sendMessage al final.

    // Iniciar la sesión de chat con el historial
    const chat = model.startChat({
      history: geminiHistory, // Pasa el historial normalizado
      generationConfig: {
        maxOutputTokens: 500, // Ajusta según tus necesidades
      },
    });

    // Enviar el mensaje actual del usuario
    // El fullPrompt se maneja internamente como el "primer mensaje" que Gemini verá para contextualizar.
    const result = await chat.sendMessage(fullPrompt); // Enviamos el prompt completo incluyendo el mensaje del usuario

    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error("Error al obtener respuesta de Gemini:", error);
    // Si el error es una instancia de GoogleGenerativeAIFetchError, puedes inspeccionar error.status
    if (error.status === 400) {
      console.error("Detalles del error 400 de Gemini:", error.errorDetails);
      // Podrías intentar un reintento con menos historial o un historial vacío aquí
    }
    throw new Error(
      "Lo siento, no pude generar una respuesta en este momento. Por favor, intenta de nuevo más tarde."
    );
  }
}

module.exports = {
  getGeminiResponse,
};
