const express = require("express");
const router = express.Router();
const whatsappController = require("../controllers/whatsappController");

// Ruta protegida con JWT
router.get("/status/:userId", whatsappController.getStatus);

module.exports = router;
