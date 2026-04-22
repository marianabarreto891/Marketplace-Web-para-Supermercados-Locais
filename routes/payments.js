var express = require("express");
var router = express.Router();

const paymentController = require("../controllers/paymentController");
const { requireAuth } = require("../middlewares/auth");

router.post(
  "/checkout/:orderId",
  requireAuth,
  paymentController.createCheckoutSession,
);

router.get("/success", requireAuth, paymentController.handleCheckoutSuccess);
router.get("/cancel", requireAuth, paymentController.handleCheckoutCancel);

module.exports = router;
