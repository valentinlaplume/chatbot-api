const express = require("express");
const router = express.Router();
const googleCalendarController = require("../controllers/googleCalendarController");
const { checkAuth } = require("../middlewares/authMiddleware");

// Ruta para obtener URL de autorización
router.get("/auth-url", checkAuth, googleCalendarController.getGoogleAuthUrl);

// Callback para Google OAuth (puede ser GET, Google redirige acá con ?code=)
router.get(
  "/oauth2callback",
  checkAuth,
  googleCalendarController.googleOAuthCallback
);

// Crear evento
router.post("/eventos", checkAuth, googleCalendarController.crearEvento);

// Listar eventos
router.get("/eventos", checkAuth, googleCalendarController.listarEventos);

module.exports = router;
