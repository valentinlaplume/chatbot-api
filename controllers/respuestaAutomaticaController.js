const respuestaService = require("../services/respuestaAutomaticaService");

/**
 * Obtener todas las respuestas automáticas del usuario autenticado
 */
async function listar(req, res) {
  try {
    const userId = req.user.idUsuario;
    const respuestas = await respuestaService.obtenerPorUsuario(userId);
    res.json(respuestas || {});
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al obtener respuestas", detalle: error.message });
  }
}

/**
 * Agregar una nueva respuesta automática
 */
async function crear(req, res) {
  try {
    const userId = req.user.idUsuario;
    const { emisor, mensaje, respuesta } = req.body;

    if (!emisor || !mensaje || !respuesta) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    const nueva = { emisor, mensaje, respuesta };
    const ref = await respuestaService.agregar(userId, nueva);

    res.status(201).json({
      success: true,
      mensaje: "Respuesta guardada correctamente",
      key: ref.key, // importante para ediciones futuras
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al crear respuesta", detalle: error.message });
  }
}

/**
 * Editar una respuesta automática por key
 */
async function editar(req, res) {
  try {
    const userId = req.user.idUsuario;
    const key = req.params.key;
    const { emisor, mensaje, respuesta } = req.body;

    if (!key || !emisor || !mensaje || !respuesta) {
      return res.status(400).json({ error: "Datos inválidos" });
    }

    const nueva = { emisor, mensaje, respuesta };
    await respuestaService.editar(userId, key, nueva);

    res.json({ success: true, mensaje: "Respuesta modificada correctamente" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al editar respuesta", detalle: error.message });
  }
}

/**
 * Borrar una respuesta automática por key
 */
async function eliminar(req, res) {
  try {
    const userId = req.user.idUsuario;
    const key = req.params.key;

    if (!key) {
      return res.status(400).json({ error: "Key inválida" });
    }

    await respuestaService.borrar(userId, key);

    res.json({ success: true, mensaje: "Respuesta eliminada correctamente" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al eliminar respuesta", detalle: error.message });
  }
}

module.exports = {
  listar,
  crear,
  editar,
  eliminar,
};
