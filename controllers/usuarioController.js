const { createClient } = require("../services/whatsappClient"); 
const _usuarioBusiness = require("../business/usuarioBusiness");

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "tu_secreto_super_seguro"; 

function login(req, res) {
  const { usuario, password } = req.body;
  const user = _usuarioBusiness.validarCredenciales(usuario, password);

  if (user) {
    // Crear token JWT con la info que queramos (ej: id y usuario)
    const token = jwt.sign(
      { idUsuario: user.id, usuario: user.usuario },
      JWT_SECRET,
      { expiresIn: "8h" } // duración opcional
    );

    // Crear cliente WhatsApp usando id numérico
    req.app.locals.createClient(user.id);

    return res.json({
      success: true,
      token, // <-- devolvemos el token aquí
      idUsuario: user.id,
      usuario: user.usuario,
    });
  } else {
    return res
      .status(401)
      .json({ success: false, error: "Credenciales inválidas" });
  }
}
  
  
function logout(_req, res) {
  // En JWT, no hay "cerrar sesión" real del lado del server,
  // pero podrías implementar un blacklist si querés invalidarlo.
  res.json({
    success: true,
    message: "Sesión cerrada (token sigue activo hasta expirar)",
  });
}
  

function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No autorizado, falta token" });
  }

  const token = authHeader.split(" ")[1]; // asumiendo formato: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: "No autorizado, token mal formado" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // ponemos la info del usuario decodificada en req.user
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}
  

module.exports = {
  login,
  logout,
  checkAuth,
};
