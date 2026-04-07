var express = require("express");
var router = express.Router();
const User = require("../models/User");
const loginController = require("../controllers/loginController");

router.post("/login", loginController.loginUser);

/* GET: Mostrar formulário de login */
router.get("/login", function (req, res) {
  // CORRIGIDO: Adicionado "users/"
  res.render("users/login");
});

/* GET: Mostrar formulário de registo */
router.get("/register", function (req, res) {
  // CORRIGIDO: Adicionado "users/"
  res.render("users/register");
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
    
    // Mostra a página de sucesso
    res.render("users/registerSuccess");
    
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