var express = require("express");
var router = express.Router();
const User = require("../models/User");
const loginController = require("../controllers/loginController");

router.post("/login", loginController.loginUser);

router.get("/login", function (req, res) {
  res.render("login");
});

/* GET: Mostrar formulário de registo */
router.get("/register", function (req, res) {
  res.render("register");
});

/* POST: Processar o registo de um novo utilizador */
router.post("/register", async function (req, res) {
  try {
    const newUser = new User(req.body);

    if (newUser.role === "supermercado") {
      newUser.isApproved = false;
    } else {
      newUser.isApproved = true;
    }

    await newUser.save();
    res.send(
      'Utilizador registado com sucesso! <a href="/users/login">Ir para Login</a>',
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao registar utilizador: " + error.message);
  }
});

router.get("/logout", function (req, res) {
  req.session.destroy(function (err) {
    if (err) {
      console.error("Erro ao fazer logout:", err);
      return res.status(500).send("Erro ao terminar sessão!");
    }

    res.redirect("/users/login");
  });
});

module.exports = router;
