const { Router } = require("express");
const ctrl = require("../controllers/goals");

const router = Router();

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.patch("/reorder", ctrl.reorder);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
