// controllers/chatbotController.js
// Ya no necesitamos importar whatsappService aquí
// const whatsappService = require("../services/whatsappClient"); // <--- ELIMINAR ESTA LÍNEA

const geminiService = require("../services/geminiService");
const usuarioService = require("../services/usuarioService");
const conversacionService = require("../services/conversacionService");

/**
 * Procesa un mensaje entrante de WhatsApp y genera una respuesta.
 * Esta función está diseñada para ser llamada internamente.
 * @param {object} messageData - Objeto que contiene los datos del mensaje.
 * @param {string} messageData.message - El texto del mensaje recibido.
 * @param {string} messageData.senderId - El ID del remitente (número de WhatsApp del cliente final).
 * @param {string} messageData.instanceId - El ID de la instancia de WhatsApp (userId del emprendedor).
 * @returns {Promise<string>} - El texto de la respuesta a enviar.
 */
async function handleIncomingWhatsAppMessage(messageData) {
  const { message, senderId, instanceId } = messageData;
  let responseText =
    "Lo siento, ha ocurrido un error inesperado. Por favor, intenta de nuevo más tarde."; // Mensaje de fallback por defecto

  try {
    if (!message || !senderId || !instanceId) {
      console.error(
        "Faltan parámetros en el objeto messageData para procesar el mensaje interno."
      );
      return responseText; // Devuelve el mensaje de fallback
    }

    const enterpriseData = await usuarioService.getEnterpriseDataByInstanceId(
      instanceId
    );
    if (!enterpriseData) {
      console.warn(
        `No se encontró emprendimiento para instanceId: ${instanceId}. No se puede procesar el mensaje.`
      );
      return "Lo siento, no pude identificar el negocio al que estás contactando. Por favor, verifica el número o intenta más tarde.";
    }

    if (
      message.toLowerCase().includes("turno") ||
      message.toLowerCase().includes("reservar")
    ) {
      responseText = await usuarioService.processTurnoRequest(
        senderId,
        message,
        enterpriseData
      );
    } else {
      const historialConversacion =
        await conversacionService.obtenerHistorialConversacion(
          senderId,
          enterpriseData.id
        );

      responseText = await geminiService.getGeminiResponse(
        message,
        enterpriseData,
        historialConversacion
      );

      await conversacionService.agregarMensajeAlHistorial(
        senderId,
        enterpriseData.id,
        { role: "user", parts: [{ text: message }] }
      );
      await conversacionService.agregarMensajeAlHistorial(
        senderId,
        enterpriseData.id,
        { role: "model", parts: [{ text: responseText }] }
      );
    }

    return responseText; // <--- DEVOLVER LA RESPUESTA AQUÍ
  } catch (error) {
    console.error(
      "Error al procesar mensaje de WhatsApp internamente en chatbotController:",
      error
    );
    return responseText; // Devuelve el mensaje de fallback ante cualquier error
  }
}

module.exports = {
  handleIncomingWhatsAppMessage,
};
