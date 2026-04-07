const user = require("../models/User");
const bcrypt = require("bcrypt");

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const userFound = await user.findOne({ email });
    if (!userFound) {
      return res.status(400).send({ message: "Utilizador não encontrado!" });
    }

    const isMatch = await bcrypt.compare(password, userFound.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Password incorreta!" });
    }

    // 1º: GUARDAR OS DADOS NA SESSÃO
    req.session.userId = userFound._id;
    req.session.role = userFound.role;

    // 2º: FORÇAR A GRAVAÇÃO ANTES DE REDIRECIONAR

    req.session.save((err) => {
      if (err) {
        console.error("Erro ao gravar sessão:", err);
        return res.status(500).json({ message: "Erro ao iniciar sessão." });
      }

      if (userFound.role === "admin") {
        return res.redirect("/admin/dashboard");
      }

      if (userFound.role === "supermercado" || userFound.role === "estafeta") {
        return res.redirect("/supermarket/dashboard");
      }

      if (userFound.role === "cliente") {
        return res.redirect("/supermarket/list");
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro no servidor" });
  }
};
