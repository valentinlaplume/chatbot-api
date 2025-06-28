require("dotenv").config();
const express = require("express");
 const bodyParser = require("body-parser");
const path = require("path");
const { createClient } = require("./services/whatsappClient");

const { getQrCode } = require("./services/whatsappClient");

const usuarioRoutes = require("./routes/usuarioRoutes");
const respuestaRoutes = require("./routes/respuestaAutomaticaRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

const { checkAuth } = require("./middlewares/authMiddleware");

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ruta para obtener QR del usuario conectado
app.get("/api/qr", checkAuth, (req, res) => {
    const userId = req.user.idUsuario; // lo sacamos del token JWT
  const qr = getQrCode(userId);

  if (!qr) {
    return res
      .status(404)
      .json({ error: "QR no disponible para idUsuario " + userId });
  }

  res.json({ qr });
});

// Rutas públicas (a futuro)
app.use("/api/usuarios", usuarioRoutes);

// Middleware global (JWT o sesión)
app.use(checkAuth); // protege lo que sigue

// Rutas privadas
app.use("/api/respuestas", respuestaRoutes);
app.use("/api/whatsapp", whatsappRoutes);

app.locals.createClient = createClient;  // <-- esto es clave

// Ruta base
app.get("/", (req, res) => {
  res.json({ mensaje: "API chatbot Backend funcionando." });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});



  
