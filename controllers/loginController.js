const user = require("../models/User");
const bcrypt = require("bcrypt");

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const userFound = await user.findOne({ email });
    if (!userFound) {
      return res.status(400).json({ message: "Utilizador não encontrado" });
    }
    
    const isMatch = await bcrypt.compare(password, userFound.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Password incorreta" });
    }

    // 1º: GUARDAR A SESSÃO PRIMEIRO! (Isto tem de vir antes dos redirecionamentos)
    req.session.userId = userFound._id;
    req.session.role = userFound.role;

    // 2º: FAZER OS REDIRECIONAMENTOS (Sempre com 'return' atrás)
    if (
      userFound.role === "supermercado" ||
      userFound.role === "estafeta" ||
      userFound.role === "admin"
    ) {
      // Se quiseres ir direto para a lista para testar agora, podes mudar "dashboard" para "list" aqui também!
      return res.redirect("/supermarket/list");
    }

    if (userFound.role === "cliente") {
      return res.redirect("/supermarket/list");
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro no servidor" });
  }
};