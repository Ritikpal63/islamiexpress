const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { requirePermission } = require("../middleware/permissions");
const { saveUploadedImage } = require("../utils/saveUploadedImage");

router.post("/", requireAuth, requirePermission("submit_news"), async (req, res, next) => {
  try {
    const { mimeType, data } = req.body || {};
    const filename = await saveUploadedImage(mimeType, data);
    res.status(201).json({
      success: true,
      data: { url: `${req.protocol}://${req.get("host")}/api/uploads/${filename}` },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
