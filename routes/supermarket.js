var express = require("express");
var router = express.Router();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Supermarket = require("../models/Supermarket");
const User = require("../models/User");
const Category = require("../models/Category");

const { requireAuth, requireRole } = require("../middlewares/auth");

const supermarketController = require("../controllers/supermarketController");
const productController = require("../controllers/productController");

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

const ACTIVE_ORDER_STATES = ["confirmada", "em_preparacao", "em_entrega"];

function getManagedSupermarketFilter(supermarketIds) {
  return supermarketIds.length
    ? { supermercado: { $in: supermarketIds } }
    : { _id: null };
}

async function getSupermarketTopProducts(orderFilter) {
  const topProducts = await Order.aggregate([
    {
      $match: {
        ...orderFilter,
        estado: { $ne: "cancelada" },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: {
          product: "$items.product",
          name: "$items.nome",
        },
        unitsSold: { $sum: "$items.quantidade" },
        revenue: { $sum: "$items.subtotal" },
        ordersCount: { $sum: 1 },
      },
    },
    { $sort: { unitsSold: -1, revenue: -1, ordersCount: -1 } },
    { $limit: 6 },
  ]);

  return topProducts.map((product) => ({
    productId: product._id.product,
    name: product._id.name,
    unitsSold: product.unitsSold,
    revenue: product.revenue,
    ordersCount: product.ordersCount,
  }));
}

async function getCourierTopSupermarkets(userId) {
  return Order.aggregate([
    {
      $match: {
        metodoEntrega: "estafeta",
        estafeta: reqSessionObjectId(userId),
        estado: { $ne: "cancelada" },
      },
    },
    {
      $group: {
        _id: "$supermercado",
        deliveries: { $sum: 1 },
      },
    },
    { $sort: { deliveries: -1 } },
    { $limit: 6 },
    {
      $lookup: {
        from: "supermarkets",
        localField: "_id",
        foreignField: "_id",
        as: "supermarket",
      },
    },
    {
      $unwind: {
        path: "$supermarket",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        supermarketId: "$_id",
        name: "$supermarket.name",
        location: "$supermarket.location",
        deliveries: 1,
      },
    },
  ]);
}

function reqSessionObjectId(userId) {
  return typeof userId === "string"
    ? new mongoose.Types.ObjectId(userId)
    : userId;
}

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
        const orderFilter = getManagedSupermarketFilter(supermarketIds);

        const totalOrders = await Order.countDocuments(orderFilter);
        const openOrders = await Order.countDocuments({
          ...orderFilter,
          estado: { $in: ACTIVE_ORDER_STATES },
        });
        const deliveredOrders = await Order.countDocuments({
          ...orderFilter,
          estado: "entregue",
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
        const unitsSoldResult = await Order.aggregate([
          {
            $match: {
              ...orderFilter,
              estado: { $ne: "cancelada" },
            },
          },
          { $unwind: "$items" },
          {
            $group: {
              _id: null,
              totalUnits: { $sum: "$items.quantidade" },
            },
          },
        ]);
        const topProducts = await getSupermarketTopProducts(orderFilter);
        const recentOrders = await Order.find(orderFilter)
          .populate("cliente", "name")
          .populate("supermercado", "name")
          .populate("estafeta", "name")
          .sort({ createdAt: -1 })
          .limit(8);

        return res.render("supermarkets/dashboard", {
          role: req.session.role,
          supermarkets,
          summary: {
            totalOrders,
            totalRevenue: revenueResult[0] ? revenueResult[0].total : 0,
            openOrders,
            deliveredOrders,
            totalUnitsSold: unitsSoldResult[0]
              ? unitsSoldResult[0].totalUnits
              : 0,
          },
          recentOrders,
          topProducts,
          topSupermarkets: [],
          statusLabels: ORDER_STATUS_LABELS,
          deliveryLabels: DELIVERY_METHOD_LABELS,
        });
      }

      const pendingPreparation = await Order.countDocuments({
        metodoEntrega: "estafeta",
        estado: "confirmada",
        estafeta: null,
      });
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
      const totalDeliveries = await Order.countDocuments({
        metodoEntrega: "estafeta",
        estafeta: req.session.userId,
        estado: { $ne: "cancelada" },
      });
      const recentOrders = await Order.find({
        metodoEntrega: "estafeta",
        $or: [
          { estado: { $in: ["confirmada", "em_preparacao"] }, estafeta: null },
          { estafeta: req.session.userId },
        ],
      })
        .populate("cliente", "name")
        .populate("supermercado", "name")
        .populate("estafeta", "name")
        .sort({ createdAt: -1 })
        .limit(8);
      const topSupermarkets = await getCourierTopSupermarkets(
        req.session.userId,
      );

      return res.render("supermarkets/dashboard", {
        role: req.session.role,
        supermarkets: [],
        summary: {
          totalDeliveries,
          pendingPreparation,
          availableDeliveries,
          activeDeliveries,
          deliveredCount,
        },
        recentOrders,
        topProducts: [],
        topSupermarkets,
        statusLabels: ORDER_STATUS_LABELS,
        deliveryLabels: DELIVERY_METHOD_LABELS,
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      return res.status(500).send("Erro ao carregar dashboard.");
    }
  },
);

router.get("/list", requireAuth, supermarketController.listSupermarkets);
router.get(
  "/new",
  requireAuth,
  requireRole(["supermercado"]),
  supermarketController.renderCreateForm,
);
router.post(
  "/new",
  requireAuth,
  requireRole(["supermercado"]),
  supermarketController.createSupermarket,
);
router.get("/:id", requireAuth, supermarketController.showSupermarket);
router.get(
  "/:id/edit",
  requireAuth,
  requireRole(["supermercado", "admin"]),
  supermarketController.renderEditForm,
);
router.post(
  "/:id/edit",
  requireAuth,
  requireRole(["supermercado", "admin"]),
  supermarketController.updateSupermarket,
);

router.get(
  "/:supermarketId/products",
  requireAuth,
  productController.listProducts,
);
router.get(
  "/:supermarketId/products/new",
  requireAuth,
  requireRole(["supermercado"]),
  productController.renderCreateForm,
);
router.post(
  "/:supermarketId/products/new",
  requireAuth,
  requireRole(["supermercado"]),
  productController.createProduct,
);
router.get(
  "/:supermarketId/products/:productId/edit",
  requireAuth,
  requireRole(["supermercado"]),
  productController.renderEditForm,
);
router.post(
  "/:supermarketId/products/:productId/edit",
  requireAuth,
  requireRole(["supermercado"]),
  productController.updateProduct,
);
router.post(
  "/:supermarketId/products/:productId/delete",
  requireAuth,
  requireRole(["supermercado"]),
  productController.deleteProduct,
);

module.exports = router;
