var express = require("express");
var router = express.Router();
const User = require("../models/User");
const loginController = require("../controllers/loginController");

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

router.post("/login", loginController.loginUser);

/* GET: Mostrar formulário de login */
router.get("/login", function (req, res) {
  
  res.render("users/login");
});

/* GET: Mostrar formulário de registo */
router.get("/register", function (req, res) {

  res.render("users/register");
});

/* POST: Processar o registo de um novo utilizador */
router.post("/register", async function (req, res) {
  try {
    const baseAddress = normalizeText(req.body.address || req.body.morada);
    const postalCode = normalizeText(
      req.body.postalCode || req.body.codigoPostal,
    );
    const city = normalizeText(req.body.city || req.body.localidade);
    const phone = normalizeText(
      req.body.phone || req.body.telephone || req.body.telefone,
    );
    const address = [baseAddress, [postalCode, city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");

    const newUser = new User({
      name: normalizeText(req.body.name || req.body.nome),
      email: normalizeEmail(req.body.email),
      password: req.body.password,
      address,
      phone,
      telephone: phone,
      role: req.body.role,
    });

    if (newUser.role === "supermercado") {
      newUser.isApproved = false;
    } else {
      newUser.isApproved = true;
    }

    await newUser.save();
    
    
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
