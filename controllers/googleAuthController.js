// controllers/googleAuthController.js
const googleAuthService = require("../services/googleAuthService");
const usuarioService = require("../services/usuarioService");

// Paso 1: Redirigir al usuario a Google para autorizar
function obtenerLinkAutorizacion(req, res) {
  const url = googleAuthService.getAuthUrl();
  res.json({ url });
}

// Paso 2: Intercambiar el code por tokens
async function recibirCodigo(req, res) {
  try {
    const { code } = req.body;
    const userId = req.user.idUsuario;

    if (!code || !userId) {
      return res.status(400).json({ error: "Faltan parámetros" });
    }

    const tokens = await googleAuthService.getTokenFromCode(code);

    // Guardar tokens en la base de datos del usuario
    await usuarioService.guardarTokens(userId, tokens);

    res.json({
      success: true,
      mensaje: "Tokens de Google Calendar guardados correctamente",
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error al obtener los tokens", detalle: err.message });
  }
}

module.exports = {
  obtenerLinkAutorizacion,
  recibirCodigo,
};
