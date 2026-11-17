const router = require("express").Router();
const { requireAuth, allowRoles } = require("../middleware/auth");
const { saveUploadedImage } = require("../utils/saveUploadedImage");

router.post("/", requireAuth, allowRoles("reporter", "editor", "admin", "super_admin"), async (req, res, next) => {
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
