const { Router } = require("express");
const ctrl = require("../controllers/transactions");

const router = Router();

router.get("/", ctrl.list);
router.get("/:id", ctrl.getById);
router.post("/", ctrl.create);
router.post("/bulk", ctrl.bulkCreate);
router.put("/bulk", ctrl.bulkUpdate);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
