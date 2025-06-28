const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const respuestaAutomaticaService = require("../services/respuestaAutomaticaService");

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

function safeReconnect(userId) {
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

  client.on("message", async (message) => {
    try {
      const textoRecibido = message.body.toLowerCase();
      const respuestas = await respuestaAutomaticaService.obtenerPorUsuario(
        userId
      ); // <- este método te devuelve un objeto
      const listaRespuestas = Object.values(respuestas || {});

      for (const respuesta of listaRespuestas) {
        if (
          (respuesta.emisor === "todos" || respuesta.emisor === message.from) &&
          textoRecibido.includes(respuesta.mensaje.toLowerCase())
        ) {
          await message.reply(respuesta.respuesta);
          break;
        }
      }
    } catch (error) {
      console.error("❌ Error procesando mensaje:", error.message);
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


module.exports = {
  createClient,
  getQrCode,
  getConnectionStatus,
};
