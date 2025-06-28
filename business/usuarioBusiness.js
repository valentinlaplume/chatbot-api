const repo = require("../repository/usuarioRepository");

function validarCredenciales(usuario, password) {
  const usuarios = repo.cargarUsuarios();
  return usuarios.find((u) => u.usuario === usuario && u.password === password) || null;
}

module.exports = {
  validarCredenciales,
};
