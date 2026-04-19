var express = require("express");
var router = express.Router();

const courierController = require("../controllers/courierController");
const { requireAuth, requireRole } = require("../middlewares/auth");

router.use(requireAuth, requireRole(["estafeta"]));

router.get("/", function (req, res) {
  res.redirect("/courier/dashboard");
});

router.get("/dashboard", courierController.dashboard);

module.exports = router;
