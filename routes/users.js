var express = require("express");
var router = express.Router();
const { requireAuth } = require("../middlewares/auth");

const loginController = require("../controllers/loginController");
const userController = require("../controllers/userController");


router.get("/login", userController.renderLoginForm);
router.post("/login", loginController.loginUser);

router.get("/register", userController.renderRegisterForm);
router.post("/register", userController.registerUser);

router.get("/profile", requireAuth, userController.renderProfile);

router.get("/logout", userController.logoutUser);

module.exports = router;
