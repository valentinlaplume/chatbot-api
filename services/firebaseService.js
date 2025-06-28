const admin = require("firebase-admin");
const path = require("path");

// Validar variables necesarias
if (!process.env.FILE_NAME_FIREBASE_CONFIG || !process.env.URL_FIREBASE) {
  throw new Error(
    "⚠️ Faltan variables de entorno para Firebase (FILE_NAME_FIREBASE_CONFIG o URL_FIREBASE)"
  );
}

// Cargar archivo de configuración de Firebase
const serviceAccount = require(path.join(
  __dirname,
  "..",
  "config",
  `${process.env.FILE_NAME_FIREBASE_CONFIG}.json`
));
  

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.URL_FIREBASE,
});

const db = admin.database();

// Funciones reutilizables
function getRef(path) {
  return db.ref(path);
}

async function get(path) {
  const snapshot = await getRef(path).once("value");
  return snapshot.val() || {};
}

async function push(path, data) {
  return await getRef(path).push(data);
}

async function update(path, data) {
  return await getRef(path).update(data);
}

async function remove(path) {
  return await getRef(path).remove();
}

module.exports = {
  getRef,
  get,
  push,
  update,
  remove,
};
