const express = require("express");
const router = express.Router();
const respuestaController = require("../controllers/respuestaAutomaticaController");
const { checkAuth } = require("../middlewares/authMiddleware");

router.get("/", checkAuth, respuestaController.listar);
router.post("/nuevo", checkAuth, respuestaController.crear);
router.put("/editar/:key", checkAuth, respuestaController.editar);
router.delete("/eliminar/:key", checkAuth, respuestaController.eliminar);

module.exports = router;
