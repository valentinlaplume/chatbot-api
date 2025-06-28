// respuestaAutomaticaService.js
const firebase = require("./firebaseService");

const basePath = "respuestas";

// Obtener todas las respuestas del usuario
async function obtenerPorUsuario(userId) {
  return await firebase.get(`${basePath}/${userId}`);
}

// Agregar una respuesta automática
async function agregar(userId, respuesta) {
  return await firebase.push(`${basePath}/${userId}`, respuesta);
}

// Editar por key
async function editar(userId, key, nuevaData) {
  return await firebase.update(`${basePath}/${userId}/${key}`, nuevaData);
}

// Eliminar por key
async function borrar(userId, key) {
  return await firebase.remove(`${basePath}/${userId}/${key}`);
}

module.exports = {
  obtenerPorUsuario,
  agregar,
  editar,
  borrar,
};
