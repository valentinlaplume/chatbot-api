const repo = require("../repository/respuestaAutomaticaRepository");

function obtenerPorUsuario(userId) {
  const datos = repo.cargarRespuestas();
  return datos[userId] || [];
}

function agregar(userId, respuesta) {
  const datos = repo.cargarRespuestas();
  if (!datos[userId]) datos[userId] = [];
  datos[userId].push(respuesta);
  repo.guardarRespuestas(datos);
}

function editar(userId, index, nueva) {
  const datos = repo.cargarRespuestas();
  if (datos[userId] && datos[userId][index]) {
    datos[userId][index] = nueva;
    repo.guardarRespuestas(datos);
  }
}

function borrar(userId, index) {
  const datos = repo.cargarRespuestas();
  if (datos[userId] && datos[userId][index]) {
    datos[userId].splice(index, 1);
    repo.guardarRespuestas(datos);
  }
}

module.exports = {
  obtenerPorUsuario,
  agregar,
  editar,
  borrar,
};
