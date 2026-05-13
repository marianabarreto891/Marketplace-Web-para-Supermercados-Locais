const User = require("../models/User");

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

exports.renderLoginForm = (req, res) => {
  res.render("users/login");
};

exports.renderRegisterForm = (req, res) => {
  res.render("users/register");
};

exports.renderProfile = async (req, res) => {
  try {
    const currentUser = await User.findById(req.session.userId).select("-password");

    if (!currentUser) {
      return res.status(404).send("Utilizador nao encontrado.");
    }

    const dashboardPath =
      currentUser.role === "admin"
        ? "/admin/dashboard"
        : currentUser.role === "supermercado"
          ? "/supermarket/dashboard"
          : currentUser.role === "estafeta"
            ? "/courier/dashboard"
            : "/supermarket/list";

    res.render("users/profile", {
      currentUser,
      dashboardPath,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao carregar perfil.");
  }
};

exports.registerUser = async (req, res) => {
  try {
    const baseAddress = normalizeText(req.body.address);
    const postalCode = normalizeText(
      req.body.postalCode);

    const city = normalizeText(req.body.city);
    const phone = normalizeText(
      req.body.phone);

    const address = [baseAddress, [postalCode, city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");

    const newUser = new User({
      name: normalizeText(req.body.name),
      email: normalizeEmail(req.body.email),
      password: req.body.password,
      address,
      phone,
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
};

exports.logoutUser = (req, res) => {
  req.session.destroy(function (err) {
    if (err) {
      console.error("Erro ao fazer logout:", err);
      return res.status(500).send("Erro ao terminar sessão!");
    }
    res.redirect("/users/login");
  });
};
