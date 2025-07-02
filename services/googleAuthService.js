// services/googleAuthService.js
const { google } = require("googleapis");
// const path = require("path"); // Ya no necesitamos 'path' para leer de archivo
// const fs = require("fs");   // Ya no necesitamos 'fs' para leer de archivo

// --- SECCIÓN DE CREDENCIALES: AHORA DESDE VARIABLE DE ENTORNO ---

let credentials;
const credentialsJsonString = process.env.GOOGLE_CALENDAR_CREDENTIALS_JSON; // Tu variable de entorno

if (!credentialsJsonString) {
  console.error(
    "❌ ERROR: La variable de entorno GOOGLE_CALENDAR_CREDENTIALS_JSON no está definida."
  );
  throw new Error(
    "GOOGLE_CALENDAR_CREDENTIALS_JSON no definida. No se puede inicializar la autenticación de Google Calendar."
  );
}

try {
  credentials = JSON.parse(credentialsJsonString);
} catch (e) {
  console.error(
    "❌ ERROR: No se pudo parsear GOOGLE_CALENDAR_CREDENTIALS_JSON como JSON.",
    e
  );
  throw new Error(
    "GOOGLE_CALENDAR_CREDENTIALS_JSON tiene un formato JSON inválido."
  );
}

// Para credenciales de tipo OAuth 2.0 (web o instalado), la estructura es diferente.
// Nos aseguramos de acceder a las propiedades correctas.
const { client_secret, client_id, redirect_uris } =
  credentials.installed || credentials.web;

// --- FIN SECCIÓN DE CREDENCIALES ---

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

// Genera URL para que el usuario autorice acceso
function getAuthUrl() {
  return oAuth2Client.generateAuthUrl({
    access_type: "offline", // importante para refresh tokens
    scope: SCOPES,
  });
}

// Recibe el código, lo intercambia por tokens
async function getTokenFromCode(code) {
  const { tokens } = await oAuth2Client.getToken(code);

  // Opcional: Si quieres guardar los tokens en algún lugar persistente (BD, etc.)
  // para no pedir al usuario que autorice de nuevo.
  // console.log('Tokens obtenidos:', tokens);

  return tokens;
}

// Crea cliente con los tokens del usuario
function getAuthorizedClient(tokens) {
  const client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  client.setCredentials(tokens); // Aquí se configuran los tokens de acceso y refresh del usuario
  return google.calendar({ version: "v3", auth: client });
}

module.exports = {
  getAuthUrl,
  getTokenFromCode,
  getAuthorizedClient,
  // Opcional: exportar oAuth2Client si lo necesitas directamente en otras partes
  // oAuth2Client,
};
