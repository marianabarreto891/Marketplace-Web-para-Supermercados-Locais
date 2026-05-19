const User = require("../models/User");
const Supermarket = require("../models/Supermarket");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Category = require("../models/Category");

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

exports.listProducts = async (req, res) => {
  try {
    const query = {};

    if (req.query.search) {
      query.name = { $regex: String(req.query.search).trim(), $options: "i" };
    }

    if (req.query.supermarketId) {
      query.supermarket = req.query.supermarketId;
    }

    if (req.query.categoryId) {
      query.category = req.query.categoryId;
    }

    if (req.query.status === "active") {
      query.isActive = { $ne: false };
    } else if (req.query.status === "inactive") {
      query.isActive = false;
    }

    const [products, supermarkets, categories] = await Promise.all([
      Product.find(query)
        .populate("supermarket", "name location")
        .populate("category", "name")
        .sort({ createdAt: -1, name: 1 }),
      Supermarket.find().sort({ name: 1 }),
      Category.find().sort({ name: 1 }),
    ]);

    res.render("admin/products", {
      products,
      supermarkets,
      categories,
      filters: {
        search: req.query.search || "",
        supermarketId: req.query.supermarketId || "",
        categoryId: req.query.categoryId || "",
        status: req.query.status || "",
      },
    });
  } catch (error) {
    console.error("Erro ao listar produtos no admin:", error);
    res.status(500).send("Erro ao listar produtos.");
  }
};

exports.toggleProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).send("Produto nao encontrado.");
    }

    product.isActive = product.isActive === false ? true : false;
    await product.save();

    const referer = req.headers.referer || "/admin/products";
    return res.redirect(referer);
  } catch (error) {
    console.error("Erro ao alterar estado do produto:", error);
    return res.status(500).send("Erro ao alterar estado do produto.");
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



  exports.listRefundRequests = async (req, res) => {
  try {
    const orders = await Order.find({ refundRequested: true })
      .populate("cliente", "name email")
      .populate("supermercado", "name location")
      .sort({ refundRequestedAt: -1 });

    res.render("admin/refunds", { orders });
  } catch (error) {
    console.error("Erro ao listar pedidos de reembolso:", error);
    res.status(500).send("Erro ao listar pedidos de reembolso.");
  }
};

exports.approveRefund = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).send("Encomenda não encontrada.");

    order.refundApproved = true;
    order.refundProcessedAt = new Date();
    order.estado = "cancelada";
    order.paymentStatus = "canceled";
    await order.save();

    res.redirect("/admin/refunds");
  } catch (error) {
    console.error("Erro ao aprovar reembolso:", error);
    res.status(500).send("Erro ao aprovar reembolso.");
  }
};

exports.rejectRefund = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).send("Encomenda não encontrada.");

    order.refundRequested = false;
    order.refundRejected = true;
    order.refundProcessedAt = new Date();
    await order.save();

    res.redirect("/admin/refunds");
  } catch (error) {
    console.error("Erro ao rejeitar reembolso:", error);
    res.status(500).send("Erro ao rejeitar reembolso.");
  }
};


