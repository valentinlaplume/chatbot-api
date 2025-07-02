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
      // Estado y fechas se manejan por defecto en el servicio o modelo
    } = req.body;

    // Validación de campos requeridos al crear (solo los básicos)
    if (!usuario || !password || !telefono || !mail || !nombre || !apellido) {
      return res
        .status(400)
        .json({ error: "Faltan campos requeridos para crear el usuario." });
    }

    // El servicio _usuarioService.crear debe encargarse del hashing de la contraseña
    // y de establecer valores por defecto para estado, fechaAlta, fechaModificacion.
    const nuevoUsuario = {
      usuario,
      password, // Aquí password está en texto plano, _usuarioService.crear debe hashearlo
      telefono,
      mail,
      nombre,
      apellido,
    };

    const user = await _usuarioService.crear(nuevoUsuario);
    
    // Excluimos la contraseña del objeto user antes de enviarlo
    const { password: newUserPassword, ...userWithoutPassword } = user;
    res
      .status(201)
      .json({
        success: true,
        message: "Usuario creado exitosamente.",
        user: userWithoutPassword,
      });
  } catch (error) {
    // Manejar errores específicos si el usuario ya existe, por ejemplo
    if (error.message.includes("ya existe")) {
      // Asumiendo que _usuarioService podría lanzar este error
      return res.status(409).json({ error: error.message });
    }
    console.error("Error al crear usuario:", error);
    res
      .status(500)
      .json({
        error: "Error interno del servidor al crear usuario.",
        detalle: error.message,
      });
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
 * Editar usuario (permite actualizar cualquier campo, incluyendo la configuración del chatbot)
 */
async function editar(req, res) {
  const { id } = req.params;
  
  // 1. Verificación de autorización: solo el propio usuario puede editar su perfil
  if (req.user.idUsuario !== id) {
      return res.status(403).json({ error: "No autorizado para editar este usuario. Solo puedes editar tu propio perfil." });
  }

  // 2. Captura todos los datos del cuerpo de la solicitud
  const datosActualizar = { ...req.body }; // Hacemos una copia para no modificar req.body directamente

  // 3. Validación básica: si el cuerpo de la solicitud está vacío
  if (Object.keys(datosActualizar).length === 0) {
      return res.status(400).json({ error: "Nada para actualizar. El cuerpo de la solicitud está vacío." });
  }

  // 4. Manejo de contraseña (si se incluye en la actualización)
  if (datosActualizar.password) {
      // Solo hashear si la contraseña no parece ya hasheada
      if (!datosActualizar.password.startsWith('$2a$')) {
          try {
              datosActualizar.password = await bcrypt.hash(datosActualizar.password, 10);
          } catch (hashError) {
              console.error("Error al hashear la contraseña durante la edición:", hashError);
              return res.status(500).json({ error: "Error interno del servidor al procesar la contraseña." });
          }
      }
  } else {
      // Importante: Si la contraseña no se envía en el body, asegúrate de no sobrescribir la existente con 'undefined'
      delete datosActualizar.password; 
  }

  // 5. Actualizar fechaModificacion automáticamente
  datosActualizar.fechaModificacion = new Date().toISOString();

  try {
      const exito = await _usuarioService.editar(id, datosActualizar);
      if (exito) {
          res.status(200).json({ success: true, message: "Usuario actualizado exitosamente." });
      } else {
          // Esto podría significar que el usuario no fue encontrado en el servicio
          res.status(404).json({ success: false, error: "Usuario no encontrado o no se pudo actualizar." });
      }
  } catch (error) {
      console.error("Error al editar usuario:", error);
      res.status(500).json({ success: false, error: "Error interno del servidor al editar usuario.", detalle: error.message });
  }
}

/**
 * Desactivar usuario (no borrar físicamente)
 */
async function desactivar(req, res) {
  const { id } = req.params;

  // 1. Verificación de autorización: solo el propio usuario puede desactivar su perfil
  if (req.user.idUsuario !== id) {
      return res.status(403).json({ error: "No autorizado para desactivar este usuario. Solo puedes desactivar tu propio perfil." });
  }

  try {
      const resultado = await _usuarioService.desactivar(id);
      if (resultado) {
          res.status(200).json({ success: true, message: "Usuario desactivado exitosamente." });
      } else {
          res.status(404).json({ success: false, error: "Usuario no encontrado o ya desactivado." });
      }
  } catch (error) {
      console.error("Error al desactivar usuario:", error);
      res.status(500).json({ success: false, error: "Error interno del servidor al desactivar usuario.", detalle: error.message });
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
