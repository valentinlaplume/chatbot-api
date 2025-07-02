// services/googleAuthService.js
const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

const CREDENTIALS_PATH = path.join(
  __dirname,
  "..",
  "config",
  "credentials_google_calendar.json"
);
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));

const { client_secret, client_id, redirect_uris } =
  credentials.installed || credentials.web;

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
  return tokens;
}

// Crea cliente con los tokens del usuario
function getAuthorizedClient(tokens) {
  const client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  client.setCredentials(tokens);
  return google.calendar({ version: "v3", auth: client });
}

module.exports = {
  getAuthUrl,
  getTokenFromCode,
  getAuthorizedClient,
};
