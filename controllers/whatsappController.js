const { getConnectionStatus } = require("../services/whatsappClient");

function getStatus(req, res) {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({ error: "Falta el userId" });
  }

  const status = getConnectionStatus(userId);

  res.json({
    success: true,
    ...status,
  });
}

module.exports = {
  getStatus,
};
