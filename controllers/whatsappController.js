const { getConnectionStatus } = require("../services/whatsappClient");

function validarUUID(uuid) {
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(uuid);
}

async function getStatus(req, res) {
  const userId = req.params.userId;

  if (!userId || !validarUUID(userId)) {
    return res.status(400).json({ error: "userId inválido o faltante" });
  }

  try {
    const status = await getConnectionStatus(userId);

    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}


module.exports = {
  getStatus
  
};
