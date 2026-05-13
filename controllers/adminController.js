const User = require("../models/User");
const Supermarket = require("../models/Supermarket");
const Order = require("../models/Order");

exports.getDashboard = async (req, res) => {
  try {
    const pendingSupermarkets = await Supermarket.find({
      toApprove: false,
    }).populate("manager", "name email");
    const totalUsers = await User.countDocuments();
    const activeSupermarkets = await Supermarket.countDocuments({
      isApproved: true,
    });
    const totalOrders = await Order.countDocuments();

    const allSupermarkets = await Supermarket.find();

    res.render("admin/dashboard", {
      pendingSupermarkets,
      totalUsers,
      activeSupermarkets,
      totalOrders,
      allSupermarkets,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao carregar o dashboard de administração!");
  }
};

exports.approveSupermarket = async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.id);
    if (!supermarket)
      return res.status(404).send("Supermercado não encontrado!");

    supermarket.isApproved = true;
    supermarket.toApprove = true;
    await supermarket.save();
    res.redirect("/admin/dashboard");
  } catch (error) {
    res.status(500).send("Erro ao aprovar supermercado!");
  }
};

exports.disapproveSupermarket = async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.id);
    if (!supermarket)
      return res.status(404).send("Supermercado não encontrado!");

    supermarket.isApproved = false;
    supermarket.toApprove = true;
    supermarket.rejectionReason =
      req.body.rejectionReason ||
      "Nenhum motivo especificado pelo administrador.";

    await supermarket.save();
    res.redirect("/admin/dashboard");
  } catch (error) {
    res.status(500).send("Erro ao rejeitar supermercado!");
  }
};

exports.listUsers = async (req, res) => {
  try {
    const allUsers = await User.find();
    res.render("admin/usersList", { allUsers });
  } catch (error) {
    res.status(500).send("Erro ao listar utilizadores!");
  }
};

exports.listReviews = async (req, res) => {
  try {
    const reviewedOrders = await Order.find({
      $or: [
        { "avaliacaoSupermercado.rating": { $exists: true } },
        { "avaliacaoEstafeta.rating": { $exists: true } },
      ],
    })
      .populate("cliente", "name email")
      .populate("supermercado", "name")
      .populate("estafeta", "name")
      .sort({ updatedAt: -1, createdAt: -1 });

    res.render("admin/reviews", { reviewedOrders });
  } catch (error) {
    console.error("Erro ao listar reviews:", error);
    res.status(500).send("Erro ao listar reviews!");
  }
};

exports.renderCreateAdminForm = (req, res) => {
  res.render("admin/createAdmin");
};

exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).send("Já existe um utilizador com este email.");
    }

    const newAdmin = new User({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      address,
      role: "admin",
      isApproved: true,
    });

    await newAdmin.save();

    res.redirect("/admin/users");
  } catch (error) {
    console.error("Erro ao criar admin:", error);
    res.status(500).send("Erro ao criar novo administrador.");
  }
};
