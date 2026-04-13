var express = require("express");
var router = express.Router();

const loginController = require("../controllers/loginController");
const userController = require("../controllers/userController");

/* GET/POST: Login */
router.get("/login", userController.renderLoginForm);
router.post("/login", loginController.loginUser);

/* GET/POST: Registo */
router.get("/register", userController.renderRegisterForm);
router.post("/register", userController.registerUser);

/* GET: Logout */
router.get("/logout", userController.logoutUser);

module.exports = router;
