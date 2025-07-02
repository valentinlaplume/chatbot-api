const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuarioController");
const { checkAuth } = require("../middlewares/authMiddleware");

// Autenticación
router.post("/login", usuarioController.login);
router.post("/logout", checkAuth, usuarioController.logout);

// CRUD de usuarios
router.post("/", usuarioController.crear); // Crear usuario
router.get("/", checkAuth, usuarioController.listar); // Listar usuarios
router.get("/:id", checkAuth, usuarioController.obtener); // Obtener uno por ID
router.put("/:id", checkAuth, usuarioController.editar); // Editar
router.delete("/:id", checkAuth, usuarioController.desactivar); // Desactivar


module.exports = router;
