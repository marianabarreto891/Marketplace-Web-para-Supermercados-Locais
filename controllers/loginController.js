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

    if (
      userFound.role === "supermercado" ||
      userFound.role === "estafeta" ||
      userFound.role === "admin"
    ) {
      res.redirect("/supermarket/dashboard");
    }

    if (userFound.role === "cliente") {
      res.redirect("/supermarket");
    }

    req.session.userId = userFound._id;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro no servidor" });
  }
};
