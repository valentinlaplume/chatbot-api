// services/conversacionService.js
const firebaseService = require("../services/firebaseService");

// Función auxiliar para sanitizar el senderId para usarlo como clave de Firebase
function sanitizeFirebaseKey(key) {
  // Reemplaza caracteres no permitidos por guiones bajos.
  // Firebase no permite ., #, $, [, ], /, \, @, %, &, +, *, =
  // También elimina !~
  return key.replace(/[.#$\[\]@%&+\*=\/\\!~]/g, "_");
}

/**
 * Añade un mensaje al historial de conversación de un usuario específico dentro de un emprendimiento.
 * Se mantiene un historial limitado para optimizar el uso de tokens y almacenamiento.
 * @param {string} userId - El ID del usuario de WhatsApp (senderId).
 * @param {string} enterpriseId - El ID del emprendimiento al que pertenece la conversación.
 * @param {object} message - El objeto mensaje a guardar (ej. { role: "user", parts: [{ text: "Hola" }] }).
 * @returns {Promise<boolean>} True si se guardó correctamente, false en caso de error.
 */
async function agregarMensajeAlHistorial(userId, enterpriseId, message) {
  try {
    const sanitizedUserId = sanitizeFirebaseKey(userId); // <--- SANITIZAR AQUÍ
    const conversacionRef = firebaseService.getRef(
      `conversaciones/${enterpriseId}/${sanitizedUserId}`
    );

    const MAX_HISTORIAL_MENSAJES = 10;

    const snapshot = await conversacionRef.once("value");
    let historial = snapshot.val() || [];

    // Asegúrate de que el mensaje a guardar tenga el formato correcto:
    // { role: "user"|"model", parts: [{ text: "..." }] }
    const formattedMessage = {
      role: message.role,
      parts: message.parts.map((part) => ({ text: part.text })), // Asegura que solo el texto esté en las partes
    };
    historial.push(formattedMessage);

    if (historial.length > MAX_HISTORIAL_MENSAJES) {
      historial = historial.slice(historial.length - MAX_HISTORIAL_MENSAJES);
    }

    await conversacionRef.set(historial);
    return true;
  } catch (error) {
    console.error("Error al añadir mensaje al historial:", error);
    return false;
  }
}

/**
 * Recupera el historial de conversación para un usuario y emprendimiento específico.
 * @param {string} userId - El ID del usuario de WhatsApp (senderId).
 * @param {string} enterpriseId - El ID del emprendimiento al que pertenece la conversación.
 * @returns {Promise<Array<object>>} Un array con el historial de la conversación, o un array vacío.
 */
async function obtenerHistorialConversacion(userId, enterpriseId) {
  try {
    const sanitizedUserId = sanitizeFirebaseKey(userId); // <--- SANITIZAR AQUÍ
    const conversacionRef = firebaseService.getRef(
      `conversaciones/${enterpriseId}/${sanitizedUserId}`
    );
    const snapshot = await conversacionRef.once("value");
    const historial = snapshot.val() || [];

    // Normalizar el historial al recuperarlo para asegurar el formato correcto antes de pasarlo a Gemini
    return historial
      .map((item) => {
        // Asegúrate de que 'item' tenga 'role' y 'parts'
        if (item && item.role && Array.isArray(item.parts)) {
          // Asegura que cada 'part' solo contenga 'text' y no propiedades anidadas 'role' o 'parts'
          return {
            role: item.role,
            parts: item.parts.map((part) => ({ text: part.text })),
          };
        }
        // Si el formato no es el esperado, devuelve un formato básico o filtra
        console.warn(
          "Elemento del historial con formato inesperado, se intentará normalizar o ignorar:",
          item
        );
        return {
          role: "user",
          parts: [{ text: "Mensaje anterior desconocido." }],
        }; // Fallback
      })
      .filter((item) => item !== null); // Filtra cualquier elemento nulo que pudiera generarse
  } catch (error) {
    console.error("Error al obtener historial de conversación:", error);
    return [];
  }
}

module.exports = {
  agregarMensajeAlHistorial,
  obtenerHistorialConversacion,
};
