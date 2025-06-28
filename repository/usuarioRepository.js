const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "..", "data", "usuarios.json");

function cargarUsuarios() {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

module.exports = {
  cargarUsuarios,
};
