// services/usuarioService.js
const firebase = require("./firebaseService");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const basePath = "usuarios"; // Asegúrate de que esta sea la ruta base donde guardas a tus emprendedores/usuarios

async function validarCredenciales(usuario, password) {
  const usuarios = await firebase.get(basePath);
  if (!usuarios) return null;

  for (const [id, user] of Object.entries(usuarios)) {
    if (
      user.usuario === usuario &&
      (await bcrypt.compare(password, user.password))
    ) {
      return { id, ...user };
    }
  }
  return null;
}

async function crear(nuevoUsuario) {
  const id = uuidv4();

  const usuarioData = {
    nombre: nuevoUsuario.nombre || "",
    apellido: nuevoUsuario.apellido || "",
    usuario: nuevoUsuario.usuario, // obligatorio
    password: await bcrypt.hash(nuevoUsuario.password, 10), // encriptar
    telefono: nuevoUsuario.telefono || "", // Este teléfono podría ser el número de WhatsApp vinculado
    mail: nuevoUsuario.mail || "",
    fechaAlta: new Date().toISOString(),
    fechaModificacion: new Date().toISOString(),
    estado: true,
    // Puedes añadir aquí un campo 'whatsappInstanceId' si lo generas o lo usas para vincular
    // Por ejemplo: whatsappInstanceId: id, // Si usas el ID del usuario como instanceId
  };

  await firebase.update(`${basePath}/${id}`, usuarioData);
  return { id, ...usuarioData };
}

async function listarTodos({ soloActivos = false } = {}) {
  const usuarios = await firebase.get(basePath);
  if (!usuarios) return [];

  return Object.entries(usuarios)
    .map(([id, user]) => ({ id, ...user }))
    .filter((user) => (soloActivos ? user.estado === true : true));
}

async function obtenerPorId(id) {
  const user = await firebase.get(`${basePath}/${id}`);
  return user ? { id, ...user } : null;
}

async function editar(id, datos) {
  datos.fechaModificacion = new Date().toISOString();
  try {
    await firebase.update(`${basePath}/${id}`, datos);
    return true;
  } catch {
    return false;
  }
}

async function desactivar(id) {
  try {
    await firebase.update(`${basePath}/${id}`, {
      estado: false,
      fechaModificacion: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

// INICIO Google calendar
async function guardarTokens(idUsuario, tokens) {
  await firebase.update(`usuarios/${idUsuario}`, {
    googleTokens: tokens,
    fechaModificacion: new Date().toISOString(),
  });
}

async function obtenerTokens(idUsuario) {
  const user = await firebase.get(`usuarios/${idUsuario}`);
  return user ? user.googleTokens : null;
}
// FIN Google calendar

// -----------------------------------------------------------
// --- NUEVAS FUNCIONES PARA LA INTEGRACIÓN DEL CHATBOT ---
// -----------------------------------------------------------

/**
 * Obtiene los datos del emprendimiento (usuario) basándose en el instanceId.
 * En tu diseño actual, el instanceId es el mismo que el userId del emprendedor.
 * @param {string} instanceId - El ID de la instancia de WhatsApp (que es el ID del usuario/emprendedor).
 * @returns {Promise<object|null>} Los datos completos del usuario/emprendimiento, o null si no se encuentra.
 */
async function getEnterpriseDataByInstanceId(instanceId) {
  // Como tu instanceId es el userId, simplemente usamos obtenerPorId
  const enterprise = await obtenerPorId(instanceId);
  // Asegúrate de que el objeto devuelto tenga un 'id' para enterpriseData.id
  if (enterprise && !enterprise.id) {
    enterprise.id = instanceId; // Añadir el ID si no lo tiene (aunque obtenerPorId ya lo añade)
  }
  return enterprise;
}

/**
 * Procesa un mensaje de usuario para solicitudes de turnos/reservas.
 * Reconoce palabras clave y devuelve una respuesta predefinida con un enlace.
 * @param {string} senderId - El ID del usuario de WhatsApp (cliente final).
 * @param {string} message - El mensaje del usuario.
 * @param {object} enterpriseData - Datos del emprendimiento.
 * @returns {Promise<string>} La respuesta del bot sobre el turno/reserva.
 */
async function processTurnoRequest(senderId, message, enterpriseData) {
  const lowerCaseMessage = message.toLowerCase();

  // Ahora usamos 'urlReserva' desde enterpriseData
  const urlReserva = enterpriseData.urlReserva || "NO DISPONIBLE ACTUALMENTE"; // Asegúrate de que este campo esté en Firebase
  const nombreNegocio =
    enterpriseData.nombreNegocio || "nosotros";

  if (
    lowerCaseMessage.includes("turno") ||
    lowerCaseMessage.includes("reservar") ||
    lowerCaseMessage.includes("cita")
  ) {
    return `¡Claro! Para agendar un turno o una cita con ${nombreNegocio}, por favor visita nuestro sistema de reservas online aquí: ${urlReserva}. ¡Es súper fácil y rápido! Si tenés alguna otra consulta, no dudes en preguntar. 😊`;
  }

  return `Entiendo que tu mensaje podría estar relacionado con turnos, pero no estoy segura de qué necesitas exactamente. ¿Podrías ser más específica/o?`;
}

module.exports = {
  validarCredenciales,
  crear,
  listarTodos,
  obtenerPorId,
  editar,
  desactivar,
  // --- GoogleCalendar
  guardarTokens,
  obtenerTokens,
  // --- NUEVAS EXPORTACIONES PARA CHATBOT ---
  getEnterpriseDataByInstanceId, 
  processTurnoRequest, 
};
