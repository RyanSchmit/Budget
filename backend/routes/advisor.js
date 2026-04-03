const { Router } = require("express");
const ctrl = require("../controllers/advisor");

const router = Router();

router.get("/conversations", ctrl.listConversations);
router.post("/conversations", ctrl.createConversation);
router.get("/conversations/:id", ctrl.getConversation);
router.patch("/conversations/:id", ctrl.updateConversation);
router.delete("/conversations/:id", ctrl.deleteConversation);

router.get("/conversations/:id/messages", ctrl.getMessages);
router.post("/conversations/:id/messages", ctrl.sendMessage);

router.get("/conversations/:id/context", ctrl.getContext);
router.post("/conversations/:id/context", ctrl.addContext);

module.exports = router;
