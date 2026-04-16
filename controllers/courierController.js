const mongoose = require("mongoose");

const Order = require("../models/Order");
const User = require("../models/User");

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

function toObjectId(value) {
  return typeof value === "string" ? new mongoose.Types.ObjectId(value) : value;
}

function getOrderCourierId(order) {
  if (!order || !order.estafeta) {
    return null;
  }

  return order.estafeta._id ? order.estafeta._id : order.estafeta;
}

async function attachCourierMetadata(orderInput) {
  const orders = Array.isArray(orderInput) ? orderInput : [orderInput];
  const courierIds = [
    ...new Set(
      orders
        .map((order) => getOrderCourierId(order))
        .filter(Boolean)
        .map((id) => String(id)),
    ),
  ];

  const couriers = courierIds.length
    ? await User.find({ _id: { $in: courierIds } })
        .select("name email")
        .lean()
    : [];

  const courierMap = new Map(
    couriers.map((courier) => [String(courier._id), courier]),
  );

  orders.forEach((order) => {
    if (!order) {
      return;
    }

    const courierId = getOrderCourierId(order);
    const courier = courierId ? courierMap.get(String(courierId)) : null;

    order.estafetaDisplayName = courier
      ? courier.name
      : courierId
      ? order.nomeEstafeta || "Estafeta removido"
      : "-";
  });

  return orderInput;
}

async function getTopSupermarkets(userId) {
  return Order.aggregate([
    {
      $match: {
        metodoEntrega: "estafeta",
        estafeta: toObjectId(userId),
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
        deliveries: 1,
        name: "$supermarket.name",
        location: "$supermarket.location",
      },
    },
  ]);
}

exports.dashboard = async (req, res) => {
  try {
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
      .sort({ createdAt: -1 })
      .limit(8);

    await attachCourierMetadata(recentOrders);

    const topSupermarkets = await getTopSupermarkets(req.session.userId);

    return res.render("courier/dashboard", {
      role: req.session.role,
      currentCourierId: String(req.session.userId),
      summary: {
        totalDeliveries,
        pendingPreparation,
        availableDeliveries,
        activeDeliveries,
        deliveredCount,
      },
      recentOrders,
      topSupermarkets,
      statusLabels: ORDER_STATUS_LABELS,
      deliveryLabels: DELIVERY_METHOD_LABELS,
    });
  } catch (error) {
    console.error("Erro ao carregar dashboard do estafeta:", error);
    return res.status(500).send("Erro ao carregar dashboard do estafeta.");
  }
};
