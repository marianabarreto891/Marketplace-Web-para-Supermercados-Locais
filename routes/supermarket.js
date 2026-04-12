var express = require("express");
var router = express.Router();
const Product = require("../models/Product");
const Order = require("../models/Order");
const Supermarket = require("../models/Supermarket");
const User = require("../models/User");
const Category = require("../models/Category");

const { requireAuth, requireRole } = require("../middlewares/auth");

const ORDER_STATUS_LABELS = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  em_preparacao: "Em preparacao",
  em_entrega: "Em entrega",
  entregue: "Entregue",
  cancelada: "Cancelada",
};

const DELIVERY_METHOD_LABELS = {
  levantamento_loja: "Levantamento em loja",
  estafeta: "Entrega por estafeta",
};

router.get("/", (req, res) => {
  res.redirect("/supermarket/list");
});

router.get(
  "/dashboard",
  requireAuth,
  requireRole(["admin", "supermercado", "estafeta"]),
  async function (req, res) {
    try {
      if (req.session.role === "admin") {
        return res.redirect("/admin/dashboard");
      }

      if (req.session.role === "supermercado") {
        const supermarkets = await Supermarket.find({
          manager: req.session.userId,
        }).sort({ name: 1 });
        const supermarketIds = supermarkets.map(
          (supermarket) => supermarket._id,
        );
        const orderFilter = supermarketIds.length
          ? { supermercado: { $in: supermarketIds } }
          : { _id: null };

        const totalOrders = await Order.countDocuments(orderFilter);
        const openOrders = await Order.countDocuments({
          ...orderFilter,
          estado: { $in: ["confirmada", "em_preparacao", "em_entrega"] },
        });
        const revenueResult = await Order.aggregate([
          {
            $match: {
              ...orderFilter,
              estado: { $ne: "cancelada" },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$total" },
            },
          },
        ]);
        const recentOrders = await Order.find(orderFilter)
          .populate("cliente", "name")
          .populate("supermercado", "name")
          .sort({ createdAt: -1 })
          .limit(6);

        return res.render("supermarkets/dashboard", {
          role: req.session.role,
          supermarkets,
          summary: {
            totalOrders,
            totalRevenue: revenueResult[0] ? revenueResult[0].total : 0,
            openOrders,
            approvedSupermarkets: supermarkets.filter(
              (supermarket) => supermarket.isApproved,
            ).length,
          },
          recentOrders,
          statusLabels: ORDER_STATUS_LABELS,
          deliveryLabels: DELIVERY_METHOD_LABELS,
        });
      }

      const availableDeliveries = await Order.countDocuments({
        metodoEntrega: "estafeta",
        estado: "em_preparacao",
        estafeta: null,
      });
      const activeDeliveries = await Order.countDocuments({
        metodoEntrega: "estafeta",
        estado: "em_entrega",
        estafeta: req.session.userId,
      });
      const deliveredCount = await Order.countDocuments({
        metodoEntrega: "estafeta",
        estado: "entregue",
        estafeta: req.session.userId,
      });
      const recentOrders = await Order.find({
        metodoEntrega: "estafeta",
        $or: [
          { estado: "em_preparacao", estafeta: null },
          { estafeta: req.session.userId },
        ],
      })
        .populate("cliente", "name")
        .populate("supermercado", "name")
        .sort({ createdAt: -1 })
        .limit(6);

      return res.render("supermarkets/dashboard", {
        role: req.session.role,
        supermarkets: [],
        summary: {
          availableDeliveries,
          activeDeliveries,
          deliveredCount,
        },
        recentOrders,
        statusLabels: ORDER_STATUS_LABELS,
        deliveryLabels: DELIVERY_METHOD_LABELS,
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      return res.status(500).send("Erro ao carregar dashboard.");
    }
  },
);

router.get("/list", requireAuth, async (req, res) => {
  try {
    let query = {};

    if (req.session.role === "cliente") {
      query = { isApproved: true };
    } else if (req.session.role === "supermercado") {
      query = { manager: req.session.userId };
    }

    const supermarkets = await Supermarket.find(query).populate(
      "manager",
      "name email",
    );

    res.render("supermarkets/list", {
      supermarkets,
      userRole: req.session.role,
      userId: req.session.userId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao listar supermercados!");
  }
});

router.get(
  "/new",
  requireAuth,
  requireRole(["supermercado"]),
  async (req, res) => {
    res.render("supermarkets/create");
  },
);

router.post(
  "/new",
  requireAuth,
  requireRole(["supermercado"]),
  async (req, res) => {
    try {
      const {
        name,
        description,
        location,
        hours,
        deliveryMethods,
        deliveryCost,
      } = req.body;

      const methods = Array.isArray(deliveryMethods)
        ? deliveryMethods
        : [deliveryMethods];

      const newSupermarket = new Supermarket({
        name,
        description,
        location,
        hours,
        deliveryMethods: methods,
        deliveryCost,
        manager: req.session.userId,
        isApproved: false,
      });

      await newSupermarket.save();
      res.redirect(`/supermarket/${newSupermarket._id}`);
    } catch (error) {
      console.error("Erro ao criar supermercado:", error);
      res.status(500).send("Erro ao criar supermercado: " + error.message);
    }
  },
);

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.id).populate(
      "manager",
      "name email",
    );
    if (!supermarket)
      return res.status(404).send("Supermercado não encontrado!");

    res.render("supermarkets/show", {
      supermarket,
      userRole: req.session.role,
      userId: req.session.userId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao carregar o supermercado!");
  }
});

router.get(
  "/:id/edit",
  requireAuth,
  requireRole(["supermercado", "admin"]),
  async (req, res) => {
    try {
      const supermarket = await Supermarket.findById(req.params.id);
      if (!supermarket)
        return res.status(404).send("Supermercado não encontrado!");

      if (
        req.session.role !== "admin" &&
        supermarket.manager.toString() !== req.session.userId
      ) {
        return res
          .status(403)
          .send("Acesso Negado: Só pode editar o seu próprio supermercado!");
      }

      res.render("supermarkets/edit", { supermarket });
    } catch (error) {
      console.error(error);
      res.status(500).send("Erro ao carregar formulário de edição!");
    }
  },
);

router.post(
  "/:id/edit",
  requireAuth,
  requireRole(["supermercado", "admin"]),
  async (req, res) => {
    try {
      const supermarket = await Supermarket.findById(req.params.id);
      if (!supermarket)
        return res.status(404).send("Supermercado não encontrado!");

      if (
        req.session.role !== "admin" &&
        supermarket.manager.toString() !== req.session.userId
      ) {
        return res
          .status(403)
          .send("Acesso Negado: Só pode editar o seu próprio supermercado!");
      }

      const {
        name,
        description,
        location,
        hours,
        deliveryMethods,
        deliveryCost,
      } = req.body;
      const methods = Array.isArray(deliveryMethods)
        ? deliveryMethods
        : [deliveryMethods];

      supermarket.name = name;
      supermarket.description = description;
      supermarket.location = location;
      supermarket.hours = hours;
      supermarket.deliveryMethods = methods;
      supermarket.deliveryCost = deliveryCost;
      supermarket.toApprove = false;
      supermarket.isApproved = false;

      await supermarket.save();

      res.redirect(`/supermarket/${req.params.id}`);
    } catch (error) {
      console.error(error);
      res.status(500).send("Erro ao atualizar supermercado!");
    }
  },
);

// PRODUTOS

// 1. LISTAR PRODUTOS COM PESQUISA
router.get("/:supermarketId/products", requireAuth, async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.supermarketId);
    let query = { supermarket: req.params.supermarketId };

    // Pesquisa simples por nome
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: "i" };
    }

    const products = await Product.find(query).populate("category");

    res.render("products/list", {
      products,
      supermarket,
      searchQuery: req.query.search,
      userRole: req.session.role,
    });
  } catch (error) {
    res.status(500).send("Erro ao listar produtos!");
  }
});

// 2. FORMULÁRIO DE CRIAR PRODUTO
router.get(
  "/:supermarketId/products/new",
  requireAuth,
  requireRole(["supermercado"]),
  async (req, res) => {
    try {
      const supermarket = await Supermarket.findById(req.params.supermarketId);
      if (!supermarket.isApproved) {
        return res
          .status(403)
          .send("O seu supermercado ainda não está aprovado.");
      }
      const categories = await Category.find();
      res.render("products/create", { supermarket, categories });
    } catch (error) {
      res.status(500).send("Erro ao carregar formulário.");
    }
  },
);

// 3. CRIAR PRODUTO
router.post(
  "/:supermarketId/products/new",
  requireAuth,
  requireRole(["supermercado"]),
  async (req, res) => {
    try {
      const supermarket = await Supermarket.findById(req.params.supermarketId);
      if (!supermarket.isApproved) return res.status(403).send("Não aprovado.");

      await Product.create({
        ...req.body,
        supermarket: req.params.supermarketId,
      });
      res.redirect(`/supermarket/${req.params.supermarketId}/products`);
    } catch (error) {
      res.status(500).send("Erro ao adicionar produto!");
    }
  },
);

// 4. FORMULÁRIO DE EDITAR PRODUTO
router.get(
  "/:supermarketId/products/:productId/edit",
  requireAuth,
  requireRole(["supermercado"]),
  async (req, res) => {
    try {
      const supermarket = await Supermarket.findById(req.params.supermarketId);
      if (!supermarket.isApproved) return res.status(403).send("Não aprovado.");

      const product = await Product.findById(req.params.productId);
      const categories = await Category.find();
      res.render("products/edit", { product, supermarket, categories });
    } catch (error) {
      res.status(500).send("Erro ao carregar produto.");
    }
  },
);

// 5. ATUALIZAR PRODUTO
router.post(
  "/:supermarketId/products/:productId/edit",
  requireAuth,
  requireRole(["supermercado"]),
  async (req, res) => {
    try {
      await Product.findByIdAndUpdate(req.params.productId, req.body);
      res.redirect(`/supermarket/${req.params.supermarketId}/products`);
    } catch (error) {
      res.status(500).send("Erro ao atualizar produto.");
    }
  },
);

// 6. APAGAR PRODUTO
router.post(
  "/:supermarketId/products/:productId/delete",
  requireAuth,
  requireRole(["supermercado"]),
  async (req, res) => {
    try {
      await Product.findByIdAndDelete(req.params.productId);
      res.redirect(`/supermarket/${req.params.supermarketId}/products`);
    } catch (error) {
      res.status(500).send("Erro ao apagar produto.");
    }
  },
);

module.exports = router;
