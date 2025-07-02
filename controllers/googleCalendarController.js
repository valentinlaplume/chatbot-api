const {
  getAuthUrl,
  getTokenFromCode,
  getAuthorizedClient,
} = require("../services/googleAuthService");

const usuarioService = require("../services/usuarioService"); // para guardar tokens en usuario

// 1) Devuelve URL para que el usuario autorice Google Calendar
function getGoogleAuthUrl(req, res) {
  try {
    const url = getAuthUrl();
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 2) Recibe el código de Google y guarda tokens en usuario (req.user.idUsuario)
async function googleOAuthCallback(req, res) {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "Falta código OAuth" });

    const tokens = await getTokenFromCode(code);

    // Guardar tokens en usuario (modificar para guardar donde prefieras)
    await usuarioService.guardarTokens(req.user.idUsuario, tokens);

    res.json({ success: true, tokens });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 3) Crear evento en Google Calendar
async function crearEvento(req, res) {
  try {
    const { idUsuario } = req.user;
    const tokens = await usuarioService.obtenerTokens(idUsuario);

    if (!tokens)
      return res
        .status(400)
        .json({ error: "Usuario no autorizado con Google" });

    const calendar = getAuthorizedClient(tokens);

    const evento = req.body; // espera objeto evento con formato Google Calendar

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: evento,
    });

    res.json({ success: true, evento: response.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 4) Listar eventos próximos
async function listarEventos(req, res) {
  try {
    const { idUsuario } = req.user;
    const tokens = await usuarioService.obtenerTokens(idUsuario);

    if (!tokens)
      return res
        .status(400)
        .json({ error: "Usuario no autorizado con Google" });

    const calendar = getAuthorizedClient(tokens);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    res.json({ success: true, eventos: response.data.items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getGoogleAuthUrl,
  googleOAuthCallback,
  crearEvento,
  listarEventos,
};
