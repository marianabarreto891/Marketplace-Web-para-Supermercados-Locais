var express = require("express");
var router = express.Router();
const User = require("../models/User"); // Importa o modelo user
const loginController = require("../controllers/loginController");

router.post("/login", loginController.loginUser);
router.get("/login", function (req, res) {
  res.render("login");
});

/* GET: Mostrar formulário de registo */
router.get("/register", function (req, res) {
  res.render("register"); // Vai procurar o ficheiro views/register.ejs
});

/* POST: Processar o registo de um novo utilizador */
router.post("/register", async function (req, res) {
  try {
    // req.body contém os dados enviados pelo formulário (nome, email, role, etc.)
    const novoUtilizador = new User(req.body);

    // Se o role for 'supermercado', ele começa como não aprovado
    if (novoUtilizador.role === "supermercado") {
      novoUtilizador.isApproved = false;
    } else {
      novoUtilizador.isApproved = true;
    }

    await novoUtilizador.save();
    res.send(
      'Utilizador registado com sucesso! <a href="/users/login">Ir para Login</a>',
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao registar utilizador: " + error.message);
  }
});

module.exports = router;
