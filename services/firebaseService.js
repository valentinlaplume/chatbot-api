const admin = require("firebase-admin");
// Ya no necesitamos 'path' porque no cargamos el archivo de configuración localmente
// const path = require("path");

// --- Validar y Cargar Credenciales desde Variables de Entorno ---

// Validar que las variables de entorno necesarias estén presentes
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY || !process.env.URL_FIREBASE) {
  throw new Error(
    "⚠️ Faltan variables de entorno para Firebase (FIREBASE_SERVICE_ACCOUNT_KEY o URL_FIREBASE). " +
      "Asegúrate de configurarlas en Render.com o tu archivo .env local."
  );
}

// Obtener la cadena JSON completa de la variable de entorno
const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let serviceAccount;

// Parsear la cadena JSON a un objeto JavaScript
try {
  serviceAccount = JSON.parse(serviceAccountJsonString);
} catch (e) {
  console.error(
    "❌ ERROR: No se pudo parsear FIREBASE_SERVICE_ACCOUNT_KEY como JSON. " +
      "Verifica que el valor de la variable de entorno sea un JSON válido.",
    e
  );
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_KEY tiene un formato JSON inválido."
  );
}

// ¡Importante para claves privadas! Asegúrate de que los saltos de línea sean correctos.
// Al guardar JSON en variables de entorno, los '\n' pueden escaparse a '\\n'.
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
}

// --- Fin de la carga de credenciales ---

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.URL_FIREBASE, // Esta variable ya la tenías y la seguimos usando
});

// Ahora db se inicializa con Realtime Database si eso es lo que usas
const db = admin.database();

// Funciones reutilizables (sin cambios, ya que operan sobre el objeto 'db')
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
