var express = require("express");
var router = express.Router();
const User = require("../models/User");
const Supermarket = require("../models/Supermarket");
const Order = require("../models/Order");
const { requireAuth, requireRole } = require("../middlewares/auth");

router.use(requireAuth, requireRole(["admin"]));

router.get("/dashboard", async (req, res) => {
  try {
    const pendingSupermarkets = await Supermarket.find({
      isApproved: false,
    }).populate("manager", "name email");

    const totalUsers = await User.countDocuments();
    const activeSupermarkets = await Supermarket.countDocuments({
      isApproved: true,
    });
    const totalOrders = await Order.countDocuments();

    res.render("admin/dashboard", {
      pendingSupermarkets,
      totalUsers,
      activeSupermarkets,
      totalOrders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao carregar o dashboard de administração!");
  }
});

router.post("/supermarket/:id/approve", async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.id);
    if (!supermarket)
      return res.status(404).send("Supermercado não encontrado!");

    supermarket.isApproved = true;
    await supermarket.save();

    res.redirect("/admin/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao aprovar supermercado!");
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.render("admin/usersList", { users });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao listar utilizadores!");
  }
});

module.exports = router;
