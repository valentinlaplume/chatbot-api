const _usuarioService = require("../services/usuarioService");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "tu_secreto_super_seguro";

/**
 * Login: valida credenciales, genera token JWT y crea cliente WhatsApp
 */
async function login(req, res) {
  try {
    const { usuario, password } = req.body;
    const user = await _usuarioService.validarCredenciales(usuario, password);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { idUsuario: user.id, usuario: user.usuario },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    // Crear cliente WhatsApp (puede ser async si querés esperar)
    req.app.locals.createClient(user.id);

    res.json({
      success: true,
      token,
      idUsuario: user.id,
      usuario: user.usuario,
    });
  } catch (error) {
    res.status(500).json({ error: "Error en login", detalle: error.message });
  }
}

/**
 * Logout: solo responde, el token sigue activo hasta expirar
 */
function logout(_req, res) {
  res.json({
    success: true,
    message: "Sesión cerrada (token sigue activo hasta expirar)",
  });
}

/**
 * Crear usuario nuevo
 */
async function crear(req, res) {
  try {
    const {
      usuario,
      password,
      telefono,
      mail,
      nombre,
      apellido,
      estado,
      fechaAlta,
      fechaModificacion,
    } = req.body;

    if (!usuario || !password || !telefono || !mail || !nombre || !apellido) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    const nuevoUsuario = {
      usuario,
      password,
      telefono,
      mail,
      nombre,
      apellido,
      estado: estado !== undefined ? estado : true,
      fechaAlta: fechaAlta || new Date().toISOString(),
      fechaModificacion: fechaModificacion || null,
    };

    const user = await _usuarioService.crear(nuevoUsuario);
    res.status(201).json({ success: true, mensaje: "Usuario creado", user });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al crear usuario", detalle: error.message });
  }
}

/**
 * Listar todos los usuarios
 */
async function listar(req, res) {
  try {
    const usuarios = await _usuarioService.listarTodos({ soloActivos: true });
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: "Error al listar usuarios", detalle: error.message });
  }
}


/**
 * Obtener un usuario por ID
 */
async function obtener(req, res) {
  try {
    const id = req.params.id;
    const usuario = await _usuarioService.obtenerPorId(id);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(usuario);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al obtener usuario", detalle: error.message });
  }
}

/**
 * Editar usuario
 */
async function editar(req, res) {
  try {
    const id = req.params.id;
    const {
      usuario,
      password,
      telefono,
      mail,
      nombre,
      apellido,
      estado,
      fechaModificacion,
    } = req.body;

    if (
      !usuario &&
      !password &&
      !telefono &&
      !mail &&
      !nombre &&
      !apellido &&
      estado === undefined
    ) {
      return res.status(400).json({ error: "Nada para actualizar" });
    }

    const dataActualizada = {
      ...(usuario && { usuario }),
      ...(password && { password }),
      ...(telefono && { telefono }),
      ...(mail && { mail }),
      ...(nombre && { nombre }),
      ...(apellido && { apellido }),
      estado: estado !== undefined ? estado : undefined,
      fechaModificacion: fechaModificacion || new Date().toISOString(),
    };

    const actualizado = await _usuarioService.editar(id, dataActualizada);
    if (!actualizado) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ success: true, mensaje: "Usuario actualizado" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al editar usuario", detalle: error.message });
  }
}

/**
 * Desactivar usuario (no borrar físicamente)
 */
async function desactivar(req, res) {
  try {
    const id = req.params.id;
    const resultado = await _usuarioService.desactivar(id);
    if (!resultado) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ success: true, mensaje: "Usuario desactivado" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al desactivar usuario", detalle: error.message });
  }
}

module.exports = {
  login,
  logout,
  crear,
  listar,
  obtener,
  editar,
  desactivar,
};
