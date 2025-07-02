class Usuario {
  constructor(id, usuario, password, telefono, mail, nombre, apellido) {
    this.id = id;
    this.usuario = usuario;
    this.password = password;
    this.telefono = telefono;
    this.mail = mail;
    this.nombre = nombre;
    this.apellido = apellido;
    this.fechaAlta = new Date().toISOString();
    this.estado = true,
    this.fechaModificacion = null; // se actualiza manualmente cuando sea necesario
  }
}

module.exports = Usuario;
