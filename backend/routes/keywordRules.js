const { Router } = require("express");
const ctrl = require("../controllers/keywordRules");

const router = Router();

router.get("/", ctrl.get);
router.put("/", ctrl.save);

module.exports = router;
