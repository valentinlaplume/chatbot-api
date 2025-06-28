class RespuestaAutomatica {
  constructor(idUsuario, emisor, mensaje, respuesta, key = null) {
    this.idUsuario = idUsuario; // ID del usuario dueño de la respuesta
    this.emisor = emisor; // Ej: "5491132434536@c.us"
    this.mensaje = mensaje; // Palabra clave o texto que activa esta respuesta
    this.respuesta = respuesta; // Texto que responde el bot
    this.key = key; // ID generado por Firebase (opcional)
  }
}

module.exports = RespuestaAutomatica;
