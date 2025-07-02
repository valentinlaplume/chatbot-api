const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const respuestaAutomaticaService = require("../services/respuestaAutomaticaService");
const usuarioService = require("./usuarioService"); // ajusta la ruta según corresponda
const chatbotController = require("../controllers/chatbotController"); // Importar el nuevo controlador

const clients = {};
const qrCodes = {};
const connectionStatus = {}; // <- Mantenemos el estado actual por usuario

const reconnectAttempts = {};
const MAX_ATTEMPTS = 5;

async function cargarRespuestasAutomaticas(userId) {
  try {
    const respuestas = await respuestaAutomaticaService.obtenerPorUsuario(
      userId
    );
    return respuestas || [];
  } catch (error) {
    console.error("Error cargando respuestas automáticas:", error);
    return [];
  }
}

async function safeReconnect(userId) {
  const user = await usuarioService.obtenerPorId(userId);
  if (!user) {
    console.log(
      `No existe usuario con ID ${userId}. No se intentará reconectar.`
    );
    return; // no reconectar si no existe usuario
  }

  reconnectAttempts[userId] = (reconnectAttempts[userId] || 0) + 1;

  if (reconnectAttempts[userId] <= MAX_ATTEMPTS) {
    console.log(
      `🔁 Intento ${reconnectAttempts[userId]} de reconexión para ${userId}`
    );
    setTimeout(() => createClient(userId), 3000);
  } else {
    console.warn(
      `❌ Máximos intentos alcanzados para ${userId}, se requiere intervención manual.`
    );
    connectionStatus[userId] = "failed_reconnect";
  }
}


function createClient(userId) {
  if (clients[userId]) return clients[userId]; // Ya existe

  const sessionDir = path.join(__dirname, "..", "sessions", String(userId));
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionDir }),
    puppeteer: { headless: true, args: ["--no-sandbox"] },
  });

  // Estado inicial
  connectionStatus[userId] = "initializing";

  client.on("qr", async (qr) => {
    try {
      qrCodes[userId] = await qrcode.toDataURL(qr);
      connectionStatus[userId] = "qr_received"; // Esperando escaneo
      console.log(`QR generado para usuario ${userId}`);
    } catch (err) {
      console.error(`Error generando QR para usuario ${userId}`, err);
    }
  });

  client.on("authenticated", () => {
    connectionStatus[userId] = "authenticated";
    console.log(`Cliente autenticado para usuario: ${userId}`);
  });

  client.on("ready", () => {
    qrCodes[userId] = null;
    connectionStatus[userId] = "ready";
    reconnectAttempts[userId] = 0; // 🔁 Reiniciar intentos
    console.log(`Cliente WhatsApp listo para usuario: ${userId}`);
  });

  client.on("auth_failure", (msg) => {
    console.error(`❌ Fallo de autenticación para ${userId}:`, msg);
    connectionStatus[userId] = "auth_failure";

    delete clients[userId];
    delete qrCodes[userId];
    delete connectionStatus[userId];

    safeReconnect(userId);
  });

  client.on("disconnected", (reason) => {
    console.warn(`⚠️ Desconectado para ${userId}:`, reason);
    connectionStatus[userId] = "disconnected";

    delete clients[userId];
    delete qrCodes[userId];
    delete connectionStatus[userId];

    safeReconnect(userId);
  });

  // client.on("message", async (message) => {
  //   try {
  //     const textoRecibido = message.body.toLowerCase();
  //     const respuestas = await respuestaAutomaticaService.obtenerPorUsuario(
  //       userId
  //     ); // <- este método te devuelve un objeto
  //     const listaRespuestas = Object.values(respuestas || {});

  //     for (const respuesta of listaRespuestas) {
  //       if (
  //         (respuesta.emisor === "todos" || respuesta.emisor === message.from) &&
  //         textoRecibido.includes(respuesta.mensaje.toLowerCase())
  //       ) {
  //         await message.reply(respuesta.respuesta);
  //         break;
  //       }
  //     }
  //   } catch (error) {
  //     console.error("❌ Error procesando mensaje:", error.message);
  //   }
  // });


  client.on("message", async (message) => {
    if (message.isStatus || message.fromMe) {
      return;
    }

    try {
      const textoRecibido = message.body;
      const senderId = message.from; // El ID del cliente final que envió el mensaje
      const instanceId = userId; // El ID del emprendimiento/instancia

      // --- Lógica de RESPUESTAS AUTOMÁTICAS (primera prioridad) ---
      const respuestas = await respuestaAutomaticaService.obtenerPorUsuario(
        instanceId
      );
      const listaRespuestas = Object.values(respuestas || {});
      let responseText = "";
      let handledByAutoResponse = false;

      for (const respuesta of listaRespuestas) {
        if (
          (respuesta.emisor === "todos" || respuesta.emisor === senderId) &&
          textoRecibido.toLowerCase().includes(respuesta.mensaje.toLowerCase())
        ) {
          responseText = respuesta.respuesta;
          handledByAutoResponse = true;
          break;
        }
      }

      // --- Lógica de Gemini (si no fue manejado por una respuesta automática) ---
      if (!handledByAutoResponse) {
        // Llama al controlador de chatbot para que genere la respuesta
        responseText = await chatbotController.handleIncomingWhatsAppMessage({
          message: textoRecibido,
          senderId: senderId,
          instanceId: instanceId,
        });
      }

      // AHORA whatsappClient.js ES EL ENCARGADO DE ENVIAR EL MENSAJE
      if (responseText) {
        // Solo envía si hay algo que responder
        await client.sendMessage(senderId, responseText); // Usa el 'client' que recibió el mensaje
        console.log(
          `✅ Mensaje enviado a ${senderId} desde instanceId ${instanceId}: "${responseText}"`
        );
      }
    } catch (error) {
      console.error(
        "❌ Error procesando mensaje en whatsappClient.js (onMessage):",
        error.message
      );
      // Si ocurre un error, puedes enviar un mensaje de fallback al usuario final
      await client.sendMessage(
        message.from,
        "Lo siento, hubo un problema al procesar tu solicitud. Por favor, intenta de nuevo más tarde."
      );
    }
  });

  client.initialize();
  clients[userId] = client;
  return client;
}

// Getters útiles
function getQrCode(userId) {
  return qrCodes[userId] || null;
}

function getConnectionStatus(userId) {
  const status = connectionStatus[userId] || "not_initialized";
  const attempts = reconnectAttempts[userId] || 0;

  const shouldReconnect = !clients[userId] && attempts < MAX_ATTEMPTS;

  if (shouldReconnect) {
    safeReconnect(userId); // 🔁 Siempre intenta si no está inicializado y no se pasó de intentos
  }

  return {
    status,
    reconnecting: shouldReconnect,
    attempts,
    message: shouldReconnect
      ? `Reconectando... Intento ${attempts} de ${MAX_ATTEMPTS}`
      : `Estado actual: ${status}`,
  };
}



// La función sendMessage ya no es necesaria exportarla si solo se usa internamente aquí.
// Pero si otras partes de tu app la usan para iniciar conversaciones, la mantenemos.
// Por ahora, como es el whatsappClient el que gestiona el envío de respuestas,
// podemos quitarla del module.exports si no la usan otras partes del código.
// Si necesitas que usuarioService o otras rutas inicien un mensaje, deberías mantenerla.
// Por simplicidad para este flujo, el client.sendMessage ya está disponible aquí.
// Pero la dejaremos si quieres que otros módulos puedan usarla para enviar mensajes
// a través de un cliente específico.
async function sendMessage(recipientId, messageText, instanceId) {
  const client = clients[instanceId];
  if (!client) {
      console.error(`Cliente de WhatsApp no encontrado para instanceId: ${instanceId}. No se pudo enviar el mensaje a ${recipientId}.`);
      return false;
  }
  try {
      await client.sendMessage(recipientId, messageText);
      console.log(`✅ Mensaje enviado a ${recipientId} desde instanceId ${instanceId}: "${messageText}"`);
      return true;
  } catch (error) {
      console.error(`❌ Error al enviar mensaje a ${recipientId} desde instanceId ${instanceId}:`, error);
      return false;
  }
}


module.exports = {
  createClient,
  getQrCode,
  getConnectionStatus,
};
