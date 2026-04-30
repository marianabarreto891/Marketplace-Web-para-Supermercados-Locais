const user = require("../models/User");
const bcrypt = require("bcrypt");

exports.loginUser = async (req, res) => {
  const loginValue = String(req.body.email || req.body.username || "").trim();
  const normalizedEmail = loginValue.toLowerCase();
  const { password } = req.body;

  try {
    const userFound = await user.findOne({
      $or: [{ email: normalizedEmail }, { name: loginValue }],
    });

    if (!userFound) {
      return res.status(400).render("users/login", {
        errorMessage: "Utilizador não encontrado!",
      });
    }

    const isMatch = await bcrypt.compare(password, userFound.password);
    if (!isMatch) {
      return res.status(400).render("users/login", {
        errorMessage: "Password incorreta, tente novamente!",
      });
    }

    
    req.session.userId = userFound._id;
    req.session.role = userFound.role;


    req.session.save((err) => {
      if (err) {
        console.error("Erro ao gravar sessão:", err);
        return res.status(500).render("users/login", {
          errorMessage: "Erro ao iniciar sessão.",
        });
      }

      if (userFound.role === "admin") {
        return res.redirect("/admin/dashboard");
      }

      if (userFound.role === "supermercado") {
        return res.redirect("/supermarket/dashboard");
      }

      if (userFound.role === "estafeta") {
        return res.redirect("/courier/dashboard");
      }

      if (userFound.role === "cliente") {
        return res.redirect("/supermarket/list");
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("users/login", {
      errorMessage: "Erro interno no servidor.",
    });
  }
};
