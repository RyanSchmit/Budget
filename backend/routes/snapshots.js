const { Router } = require("express");
const snapshotCtrl = require("../controllers/snapshots");
const accountCtrl = require("../controllers/snapshotAccounts");

const router = Router();

router.get("/", snapshotCtrl.list);
router.get("/:id", snapshotCtrl.getById);
router.post("/", snapshotCtrl.create);
router.put("/:id", snapshotCtrl.update);
router.delete("/:id", snapshotCtrl.remove);

// Nested account entries under a snapshot
router.get("/:snapshotId/accounts", accountCtrl.list);
router.get("/:snapshotId/accounts/:id", accountCtrl.getById);
router.post("/:snapshotId/accounts", accountCtrl.create);
router.put("/:snapshotId/accounts/:id", accountCtrl.update);
router.delete("/:snapshotId/accounts/:id", accountCtrl.remove);

module.exports = router;
