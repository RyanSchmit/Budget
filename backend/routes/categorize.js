const { Router } = require("express");
const ctrl = require("../controllers/categorize");

const router = Router();

router.post("/", ctrl.categorize);

module.exports = router;
