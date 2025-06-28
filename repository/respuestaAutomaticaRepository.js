const fs = require("fs");
const path = require("path");

const RESPUESTAS_FILE = path.join(
  __dirname,
  "..",
  "data",
  "respuestasAutomaticas.json"
);

function cargarRespuestas() {
  try {
    const data = fs.readFileSync(RESPUESTAS_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function guardarRespuestas(respuestas) {
  fs.writeFileSync(RESPUESTAS_FILE, JSON.stringify(respuestas, null, 2));
}

module.exports = {
  cargarRespuestas,
  guardarRespuestas,
};
