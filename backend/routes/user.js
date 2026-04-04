const { Router } = require("express");
const ctrl = require("../controllers/user");

const router = Router();

router.get("/profile", ctrl.getProfile);
router.patch("/preferences", ctrl.updatePreferences);

module.exports = router;
