const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuarioController");
const { checkAuth } = require("../middlewares/authMiddleware");

router.post("/login", usuarioController.login);
router.post("/logout", checkAuth, usuarioController.logout);

module.exports = router;
