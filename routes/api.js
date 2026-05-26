const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Stripe = require("stripe");

const User = require("../models/User");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supermarket = require("../models/Supermarket");
const Order = require("../models/Order");
const Coupon = require("../models/Coupon");
const { sendOrderStatusEmail } = require("../services/orderEmailService");

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *
 *     RegisterInput:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           example: Joao Silva
 *         email:
 *           type: string
 *           example: joao@gmail.com
 *         password:
 *           type: string
 *           example: 123456
 *         address:
 *           type: string
 *           example: Rua de Lisboa
 *         phone:
 *           type: string
 *           example: 912345678
 *
 *     LoginInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           example: joao@gmail.com
 *         password:
 *           type: string
 *           example: 123456
 *
 *     Product:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 665f123abc123
 *         name:
 *           type: string
 *           example: Coca Cola
 *         description:
 *           type: string
 *           example: Refrigerante 1.5L
 *         price:
 *           type: number
 *           example: 2.99
 *         stock:
 *           type: number
 *           example: 10
 *         image:
 *           type: string
 *           example: https://site.com/image.jpg
 *
 *     Category:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           example: Bebidas
 *
 *     Supermarket:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           example: Continente
 *         location:
 *           type: string
 *           example: Porto
 *         deliveryCost:
 *           type: number
 *           example: 4.99
 *
 *     OrderItem:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
 *         quantity:
 *           type: number
 *           example: 2
 *
 *     CreateOrderInput:
 *       type: object
 *       required:
 *         - deliveryMethod
 *         - items
 *       properties:
 *         deliveryMethod:
 *           type: string
 *           example: estafeta
 *         couponCode:
 *           type: string
 *           example: DESCONTO10
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *
 *     RateOrderInput:
 *       type: object
 *       required:
 *         - ratingSupermarket
 *       properties:
 *         ratingSupermarket:
 *           type: number
 *           example: 5
 *         commentSupermarket:
 *           type: string
 *           example: Excelente servico
 *         ratingCourier:
 *           type: number
 *           example: 5
 *         commentCourier:
 *           type: string
 *           example: Muito simpatico
 *
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           example: cliente
 */

let stripeClient = null;
const CLIENT_CANCEL_WINDOW_MS = 5 * 60 * 1000;

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeCouponCode(value) {
  return normalizeText(value).toUpperCase();
}

function formatOrderDisplayId(orderId) {
  return `FO-${String(orderId).slice(-6).toUpperCase()}`;
}

function toStripeAmount(value) {
  return Math.round(Number(value || 0) * 100);
}

function getFrontendBaseUrl() {
  return String(process.env.FRONTEND_BASE_URL || "http://localhost:4200")
    .trim()
    .replace(/\/+$/, "");
}

function getClientCancelDeadline(order) {
  if (!order || !order.createdAt) {
    return null;
  }

  return new Date(
    new Date(order.createdAt).getTime() + CLIENT_CANCEL_WINDOW_MS,
  );
}

function canClientCancelOrder(order) {
  const cancelDeadline = getClientCancelDeadline(order);

  return Boolean(
    order &&
    order.estado === "confirmada" &&
    order.paymentStatus !== "paid" &&
    cancelDeadline &&
    Date.now() <= cancelDeadline.getTime(),
  );
}

function mapReviewForClient(review) {
  if (!review || !review.rating) {
    return null;
  }

  return {
    rating: Number(review.rating),
    comment: review.comentario || "",
  };
}

function requireJWT(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Nao autenticado" });
  }

  try {
    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Token invalido" });
  }
}

function requireClientJWT(req, res, next) {
  if (req.user.role !== "cliente") {
    return res.status(403).json({ error: "Esta area e apenas para clientes" });
  }

  return next();
}

function mapOrderItemForClient(item) {
  return {
    productId: item.product ? String(item.product._id || item.product) : "",
    name: item.nome,
    quantity: Number(item.quantidade || 0),
    unitPrice: Number(item.precoUnitario || 0),
    subtotal: Number(item.subtotal || 0),
    image: item.product && item.product.image ? item.product.image : "",
  };
}

function mapOrderForClient(order) {
  const cancelDeadline = getClientCancelDeadline(order);

  return {
    id: String(order._id),
    displayId: formatOrderDisplayId(order._id),
    customerId: order.cliente ? String(order.cliente._id || order.cliente) : "",
    supermarketId: order.supermercado
      ? String(order.supermercado._id || order.supermercado)
      : "",
    supermarketName: order.supermercado
      ? order.supermercado.name || order.supermercado.nome || "-"
      : "-",
    supermarketLocation: order.supermercado
      ? order.supermercado.location || "-"
      : "-",
    courierId: order.estafeta ? String(order.estafeta._id || order.estafeta) : null,
    items: Array.isArray(order.items)
      ? order.items.map(mapOrderItemForClient)
      : [],
    status: order.estado,
    paymentStatus: order.paymentStatus || "pending",
    subtotal: Number(order.subtotalProdutos || 0),
    deliveryCost: Number(order.custoEntrega || 0),
    discountApplied: Number(order.discountApplied || 0),
    total: Number(order.total || 0),
    deliveryMethod: order.metodoEntrega,
    couponCode: order.couponCode || "",
    createdAt: order.createdAt,
    paidAt: order.paidAt || null,
    canCancel: canClientCancelOrder(order),
    cancelDeadline: cancelDeadline ? cancelDeadline.toISOString() : null,
    supermarketReview: mapReviewForClient(order.avaliacaoSupermercado),
    courierReview: mapReviewForClient(order.avaliacaoEstafeta),
    refundRequested: order.refundRequested || false,         
    refundRequestedAt: order.refundRequestedAt || null,       
    refundApproved: order.refundApproved || false,            
    refundRejected: order.refundRejected || false,            
    refundProcessedAt: order.refundProcessedAt || null,       
  };
}

function buildDashboardStatsForOrders(orders) {
  const totalOrders = orders.length;
  const totalSpent = Number(
    orders
      .filter((order) => order.estado !== "cancelada")
      .reduce((sum, order) => sum + Number(order.total || 0), 0)
      .toFixed(2),
  );

  const productMap = new Map();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const productId = item.product
        ? String(item.product._id || item.product)
        : item.nome;
      const current = productMap.get(productId);

      if (current) {
        current.quantity += Number(item.quantidade || 0);
        return;
      }

      productMap.set(productId, {
        productId,
        name: item.nome,
        quantity: Number(item.quantidade || 0),
      });
    });
  });

  return {
    totalOrders,
    totalSpent,
    mostPurchasedProducts: [...productMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
    recentOrders: orders.slice(0, 5).map((order) => ({
      orderId: String(order._id),
      displayId: formatOrderDisplayId(order._id),
      supermarketName: order.supermercado ? order.supermercado.name : "-",
      total: Number(order.total || 0),
      status: order.estado,
      createdAt: order.createdAt,
    })),
  };
}

async function rollbackStockReservations(stockReservations) {
  for (const reservation of stockReservations) {
    await Product.findByIdAndUpdate(reservation.productId, {
      $inc: { stock: reservation.quantity },
    });
  }
}

async function validateCouponForOrder(
  couponCode,
  supermarket,
  subtotalProdutos,
  custoEntrega,
) {
  const normalizedCode = normalizeCouponCode(couponCode);

  if (!normalizedCode) {
    return {
      coupon: null,
      couponCode: "",
      couponType: "",
      couponValue: 0,
      discountApplied: 0,
    };
  }

  const coupon = await Coupon.findOne({ code: normalizedCode });

  if (!coupon) {
    throw new Error("O cupao indicado nao existe.");
  }

  if (!coupon.isActive) {
    throw new Error("O cupao indicado esta inativo.");
  }

  const now = new Date();

  if (coupon.validFrom && now < coupon.validFrom) {
    throw new Error("O cupao ainda nao esta valido.");
  }

  if (coupon.validUntil && now > coupon.validUntil) {
    throw new Error("O cupao indicado ja expirou.");
  }

  if (
    coupon.supermarket &&
    String(coupon.supermarket) !== String(supermarket._id)
  ) {
    throw new Error("O cupao indicado nao e valido para este supermercado.");
  }

  if (subtotalProdutos < Number(coupon.minOrderValue || 0)) {
    throw new Error(
      `O cupao exige um valor minimo de EUR ${Number(
        coupon.minOrderValue || 0,
      ).toFixed(2)}.`,
    );
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    throw new Error("O cupao ja atingiu o limite de utilizacoes.");
  }

  let discountApplied = 0;

  if (coupon.type === "percent") {
    discountApplied = subtotalProdutos * (Number(coupon.value) / 100);
  } else if (coupon.type === "fixed") {
    discountApplied = Number(coupon.value);
  } else if (coupon.type === "free_shipping") {
    discountApplied = custoEntrega;
  }

  if (
    coupon.maxDiscount !== null &&
    coupon.maxDiscount !== undefined &&
    coupon.maxDiscount !== ""
  ) {
    discountApplied = Math.min(discountApplied, Number(coupon.maxDiscount));
  }

  if (coupon.type === "free_shipping") {
    discountApplied = Math.min(discountApplied, custoEntrega);
  } else {
    discountApplied = Math.min(discountApplied, subtotalProdutos);
  }

  discountApplied = Number(discountApplied.toFixed(2));

  if (discountApplied <= 0) {
    throw new Error("O cupao nao produziu qualquer desconto nesta encomenda.");
  }

  return {
    coupon,
    couponCode: coupon.code,
    couponType: coupon.type,
    couponValue: Number(coupon.value),
    discountApplied,
  };
}

async function registerCouponUsage(couponId) {
  if (!couponId) {
    return;
  }

  await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
}

async function markOrderAsPaid(order, session) {
  if (!order || order.paymentStatus === "paid") {
    return order;
  }

  order.paymentStatus = "paid";
  order.stripeCheckoutSessionId =
    (session && session.id) || order.stripeCheckoutSessionId || "";
  order.stripePaymentIntentId =
    (session && session.payment_intent && String(session.payment_intent)) ||
    order.stripePaymentIntentId ||
    "";

  if (!order.paidAt) {
    order.paidAt = new Date();
  }

  await order.save();
  return order;
}

async function findOrderForSession(session) {
  const orderId =
    (session && session.metadata && session.metadata.orderId) ||
    session.client_reference_id;

  if (!orderId) {
    return null;
  }

  return Order.findById(orderId);
}

async function sendCreationEmail(orderId) {
  try {
    const order = await Order.findById(orderId)
      .populate("cliente", "name email")
      .populate("supermercado", "name");

    if (order) {
      await sendOrderStatusEmail(order, null, order.estado);
    }
  } catch (error) {
    console.error("Erro ao enviar email de criacao da encomenda:", error);
  }
}

async function sendStatusEmail(orderId, previousStatus, nextStatus) {
  try {
    const order = await Order.findById(orderId)
      .populate("cliente", "name email")
      .populate("supermercado", "name");

    if (order) {
      await sendOrderStatusEmail(order, previousStatus, nextStatus);
    }
  } catch (error) {
    console.error("Erro ao enviar email de alteracao de estado:", error);
  }
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Regista um novo cliente
 *     tags: [Autenticacao]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: Cliente registado com sucesso
 *       400:
 *         description: Email ja registado
 */
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, address, phone } = req.body;
    const exists = await User.findOne({ email: normalizeEmail(email) });

    if (exists) {
      return res.status(400).json({ error: "Email ja registado" });
    }

    const user = new User({
      name,
      email: normalizeEmail(email),
      password,
      address,
      phone,
      role: "cliente",
      isApproved: true,
    });

    await user.save();
    return res.status(201).json({ message: "Registo efetuado com sucesso" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Faz login na conta de cliente
 *     tags: [Autenticacao]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login efetuado com sucesso
 *       400:
 *         description: Credenciais invalidas
 */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: normalizeEmail(email) });

    if (!user) {
      return res.status(400).json({ error: "Utilizador nao encontrado" });
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(400).json({ error: "Password incorreta" });
    }

    if (user.role !== "cliente") {
      return res
        .status(403)
        .json({ error: "Esta area e apenas para clientes" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.json({
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Devolve os dados do cliente autenticado
 *     tags: [Autenticacao]
 *     security:
 *       - bearerAuth: []
 */
router.get("/auth/me", requireJWT, async (req, res) => {
  const user = await User.findById(req.user.userId).select("-password");
  return res.json(user);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Lista todos os produtos (com filtros opcionais)
 *     tags: [Produtos]
 *     responses:
 *       200:
 *         description: Lista de produtos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
router.get("/products", async (req, res) => {
  try {
    const query = { isActive: { $ne: false } };

    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: "i" };
    }

    if (req.query.category && req.query.category !== "all") {
      query.category = req.query.category;
    }

    if (req.query.supermarket && req.query.supermarket !== "all") {
      query.supermarket = req.query.supermarket;
    }

    const sortOrder = req.query.sort === "desc" ? -1 : 1;
    const products = await Product.find(query)
      .populate("category", "name")
      .populate(
        "supermarket",
        "name location isApproved deliveryMethods deliveryCost",
      )
      .sort({ price: sortOrder });

    const filtered = products.filter(
      (product) => product.supermarket?.isApproved,
    );

    // Paginação
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = filtered.slice((page - 1) * limit, page * limit);
    return res.json({
      products: paginated,
      total,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Lista todas as categorias
 *     tags: [Produtos]
 *     responses:
 *       200:
 *         description: Lista de categorias
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
router.get("/categories", async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  return res.json(categories);
});

/**
 * @swagger
 * /api/products/compare:
 *   get:
 *     summary: Compara o preco de um produto em varios supermercados
 *     tags: [Produtos]
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Produtos encontrados
 */
router.get("/products/compare", async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: "Nome obrigatorio" });
    }

    const products = await Product.find({
      name: { $regex: name, $options: "i" },
      isActive: { $ne: false },
      stock: { $gt: 0 },
    })
      .populate(
        "supermarket",
        "name location isApproved deliveryMethods deliveryCost",
      )
      .populate("category", "name")
      .sort({ price: 1 });

    const filtered = products.filter(
      (product) => product.supermarket?.isApproved,
    );
    return res.json(filtered);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/supermarkets:
 *   get:
 *     summary: Lista supermercados aprovados
 *     tags: [Supermercados]
 *     responses:
 *       200:
 *         description: Lista de supermercados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Supermarket'
 */
router.get("/supermarkets", async (req, res) => {
  try {
    const supermarkets = await Supermarket.find({ isApproved: true }).sort({
      name: 1,
    });

    return res.json(supermarkets);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/supermarkets/{id}/reviews:
 *   get:
 *     summary: Lista as reviews de um supermercado
 *     tags: [Supermercados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reviews do supermercado
 */
router.get(
  "/supermarkets/:id/reviews",
  requireJWT,
  requireClientJWT,
  async (req, res) => {
    try {
      const supermarket = await Supermarket.findOne({
        _id: req.params.id,
        isApproved: true,
      }).select("name location lat lon");

      if (!supermarket) {
        return res.status(404).json({ error: "Supermercado nao encontrado." });
      }

      const reviewedOrders = await Order.find({
        supermercado: supermarket._id,
        "avaliacaoSupermercado.rating": { $exists: true },
      })
        .populate("cliente", "name")
        .sort({ updatedAt: -1, createdAt: -1 });

      const reviews = reviewedOrders.map((order) => ({
        orderId: String(order._id),
        displayId: formatOrderDisplayId(order._id),
        customerName: order.cliente ? order.cliente.name : "Cliente",
        rating: Number(order.avaliacaoSupermercado.rating || 0),
        comment: order.avaliacaoSupermercado.comentario || "",
        createdAt: order.updatedAt || order.createdAt,
      }));

      const averageRating = reviews.length
        ? Number(
            (
              reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviews.length
            ).toFixed(1),
          )
        : 0;

      return res.json({
        supermarket: {
          id: String(supermarket._id),
          name: supermarket.name,
          location: supermarket.location || "-",
          lat: supermarket.lat,
          lon: supermarket.lon,
        },
        averageRating,
        totalReviews: reviews.length,
        reviews,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
);

/**
 * @swagger
 * /api/orders/my:
 *   get:
 *     summary: Lista as encomendas do cliente autenticado
 *     tags: [Encomendas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de encomendas
 */
router.get("/orders/my", requireJWT, requireClientJWT, async (req, res) => {
  try {
    const orders = await Order.find({ cliente: req.user.userId })
      .populate("supermercado", "name")
      .populate("items.product", "image")
      .sort({ createdAt: -1 });

    return res.json(orders.map(mapOrderForClient));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Consulta o detalhe de uma encomenda do cliente autenticado
 *     tags: [Encomendas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalhes da encomenda
 */
router.get("/orders/:id", requireJWT, requireClientJWT, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      cliente: req.user.userId,
    })
      .populate("supermercado", "name")
      .populate("items.product", "image");
      .populate("estafeta", "name");

    if (!order) {
      return res.status(404).json({ error: "Encomenda nao encontrada" });
    }

    return res.json(mapOrderForClient(order));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancela uma encomenda confirmada nos primeiros 5 minutos
 *     tags: [Encomendas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Encomenda cancelada
 */
router.post(
  "/orders/:id/cancel",
  requireJWT,
  requireClientJWT,
  async (req, res) => {
    try {
      const order = await Order.findOne({
        _id: req.params.id,
        cliente: req.user.userId,
      })
        .populate("supermercado", "name location")
        .populate("items.product", "image");

      if (!order) {
        return res.status(404).json({ error: "Encomenda nao encontrada." });
      }

      if (order.estado !== "confirmada") {
        return res.status(400).json({
          error: "So podes cancelar encomendas que ainda estejam confirmadas.",
        });
      }

      if (order.paymentStatus === "paid") {
        return res.status(400).json({
          error: "Nao podes cancelar uma encomenda que ja esteja paga.",
        });
      }

      if (!canClientCancelOrder(order)) {
        return res.status(400).json({
          error: "O prazo de 5 minutos para cancelar a encomenda ja terminou.",
        });
      }

      await rollbackStockReservations(
        order.items.map((item) => ({
          productId:
            item.product && item.product._id ? item.product._id : item.product,
          quantity: Number(item.quantidade || 0),
        })),
      );

      const previousStatus = order.estado;
      order.estado = "cancelada";
      order.paymentStatus =
        order.paymentStatus === "pending" ? "canceled" : order.paymentStatus;
      await order.save();

      await releaseCouponUsage(order);
      await sendStatusEmail(order._id, previousStatus, order.estado);

      const updatedOrder = await Order.findById(order._id)
        .populate("supermercado", "name location")
        .populate("items.product", "image");

      return res.json(mapOrderForClient(updatedOrder));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
);

/**
 * @swagger
 * /api/orders/{id}/refund-request:
 *   post:
 *     summary: Submete um pedido de reembolso para uma encomenda
 *     tags: [Encomendas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pedido de reembolso submetido
 */
router.post(
  "/orders/:id/refund-request",
  requireJWT,
  requireClientJWT,
  async (req, res) => {
    try {
      const order = await Order.findOne({
        _id: req.params.id,
        cliente: req.user.userId,
      });

      if (!order) {
        return res.status(404).json({ error: "Encomenda nao encontrada." });
      }

      if (order.paymentStatus !== "paid") {
        return res
          .status(400)
          .json({ error: "So podes pedir reembolso de encomendas ja pagas." });
      }

      if (["cancelada", "entregue"].includes(order.estado)) {
        return res
          .status(400)
          .json({ error: "Nao podes pedir reembolso desta encomenda." });
      }

      if (order.refundRequested) {
        return res.status(400).json({
          error: "Ja foi feito um pedido de reembolso para esta encomenda.",
        });
      }
      // Verificar se o supermercado aceita reembolsos
      const supermarket = await Supermarket.findById(order.supermercado);
      if (supermarket && supermarket.acceptsRefunds === false) {
        return res
          .status(400)
          .json({
            error: "Este supermercado nao aceita pedidos de reembolso.",
          });
      }
      order.refundRequested = true;
      order.refundRequestedAt = new Date();
      await order.save();

      return res.json({
  message: "Pedido de reembolso submetido com sucesso. O supermercado irá analisar o pedido.",
});
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
);

/**
 * @swagger
 * /api/orders/{id}/refund-accept:
 *   post:
 *     summary: Aceita o pedido de reembolso de uma encomenda
 *     tags: [Encomendas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da encomenda
 *     responses:
 *       200:
 *         description: Reembolso aceite com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reembolso aceite com sucesso.
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Encomenda não encontrada
 *       400:
 *         description: Pedido já processado ou inexistente
 */
router.post(
  "/orders/:id/refund-accept",
  requireJWT,
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.id).populate("supermercado");
      if (!order) return res.status(404).json({ error: "Encomenda nao encontrada." });

      const isAdmin = req.user.role === "admin";
      const isManager = order.supermercado && String(order.supermercado.manager) === String(req.user.userId);
      if (!isAdmin && !isManager) return res.status(403).json({ error: "Sem permissao para aceitar este reembolso." });

      if (!order.refundRequested) return res.status(400).json({ error: "Nao existe pedido de reembolso para esta encomenda." });
      if (order.refundApproved || order.refundRejected) return res.status(400).json({ error: "Este pedido de reembolso ja foi processado." });

      order.refundApproved = true;
      order.refundRejected = false;
      order.refundProcessedAt = new Date();
      await order.save();

      return res.json({ message: "Reembolso aceite com sucesso." });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);


/**
 * @swagger
 * /api/orders/{id}/refund-reject:
 *   post:
 *     summary: Rejeita o pedido de reembolso de uma encomenda
 *     tags: [Encomendas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da encomenda
 *     responses:
 *       200:
 *         description: Reembolso rejeitado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reembolso rejeitado.
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Encomenda não encontrada
 *       400:
 *         description: Pedido já processado ou inexistente
 */
router.post(
  "/orders/:id/refund-reject",
  requireJWT,
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.id).populate("supermercado");
      if (!order) return res.status(404).json({ error: "Encomenda nao encontrada." });

      const isAdmin = req.user.role === "admin";
      const isManager = order.supermercado && String(order.supermercado.manager) === String(req.user.userId);
      if (!isAdmin && !isManager) return res.status(403).json({ error: "Sem permissao para rejeitar este reembolso." });

      if (!order.refundRequested) return res.status(400).json({ error: "Nao existe pedido de reembolso para esta encomenda." });
      if (order.refundApproved || order.refundRejected) return res.status(400).json({ error: "Este pedido de reembolso ja foi processado." });

      order.refundApproved = false;
      order.refundRejected = true;
      order.refundProcessedAt = new Date();
      await order.save();

      return res.json({ message: "Reembolso rejeitado." });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/orders/{id}/rate:
 *   post:
 *     summary: Submete a review de uma encomenda entregue
 *     tags: [Encomendas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RateOrderInput'
 *     responses:
 *       200:
 *         description: Avaliacao submetida
 */
router.post(
  "/orders/:id/rate",
  requireJWT,
  requireClientJWT,
  async (req, res) => {
    try {
      const order = await Order.findOne({
        _id: req.params.id,
        cliente: req.user.userId,
      })
        .populate("supermercado", "name location")
        .populate("items.product", "image");

      if (!order) {
        return res.status(404).json({ error: "Encomenda nao encontrada." });
      }

      if (order.estado !== "entregue") {
        return res.status(400).json({
          error: "So podes avaliar encomendas que ja foram entregues.",
        });
      }

      if (order.avaliacaoSupermercado && order.avaliacaoSupermercado.rating) {
        return res.status(400).json({
          error: "Esta encomenda ja foi avaliada.",
        });
      }

      const ratingSupermarket = Number(req.body.ratingSupermarket);
      const ratingCourier = Number(req.body.ratingCourier);
      const hasCourierReview =
        order.metodoEntrega === "estafeta" &&
        order.estafeta &&
        Number.isFinite(ratingCourier) &&
        ratingCourier >= 1 &&
        ratingCourier <= 5;

      if (
        !Number.isFinite(ratingSupermarket) ||
        ratingSupermarket < 1 ||
        ratingSupermarket > 5
      ) {
        return res.status(400).json({
          error: "A avaliacao do supermercado tem de estar entre 1 e 5.",
        });
      }

      order.avaliacaoSupermercado = {
        rating: ratingSupermarket,
        comentario: normalizeText(req.body.commentSupermarket),
      };

      if (hasCourierReview) {
        order.avaliacaoEstafeta = {
          rating: ratingCourier,
          comentario: normalizeText(req.body.commentCourier),
        };
      }

      await order.save();

      const updatedOrder = await Order.findById(order._id)
        .populate("supermercado", "name location")
        .populate("items.product", "image");

      return res.json(mapOrderForClient(updatedOrder));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Cria uma nova encomenda para o cliente autenticado
 *     tags: [Encomendas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderInput'
 *     responses:
 *       201:
 *         description: Encomenda criada com sucesso
 */
router.post("/orders", requireJWT, requireClientJWT, async (req, res) => {
  try {
    const deliveryMethod = normalizeText(req.body.deliveryMethod);
    const couponCode = normalizeCouponCode(req.body.couponCode);
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];

    if (!rawItems.length) {
      return res
        .status(400)
        .json({ error: "Tens de selecionar pelo menos um produto." });
    }

    if (!["levantamento_loja", "estafeta"].includes(deliveryMethod)) {
      return res.status(400).json({ error: "Metodo de entrega invalido." });
    }

    const selectionMap = new Map();

    for (const item of rawItems) {
      const productId = normalizeText(item.productId);
      const quantity = Number(item.quantity);

      if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          error: "Existem produtos com quantidades invalidas.",
        });
      }

      selectionMap.set(
        productId,
        (selectionMap.get(productId) || 0) + quantity,
      );
    }

    const selections = [...selectionMap.entries()].map(
      ([productId, quantity]) => ({
        productId,
        quantity,
      }),
    );

    const productIds = selections.map((selection) => selection.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: { $ne: false },
    }).populate(
      "supermarket",
      "name location isApproved deliveryMethods deliveryCost",
    );

    if (products.length !== productIds.length) {
      return res
        .status(400)
        .json({ error: "Existem produtos invalidos na encomenda." });
    }

    const supermarketIds = [
      ...new Set(
        products
          .map((product) =>
            product.supermarket ? String(product.supermarket._id) : "",
          )
          .filter(Boolean),
      ),
    ];

    if (supermarketIds.length !== 1) {
      return res.status(400).json({
        error: "So podes encomendar produtos de um supermercado de cada vez.",
      });
    }

    const supermarket = products[0].supermarket;

    if (!supermarket || !supermarket.isApproved) {
      return res.status(400).json({
        error: "O supermercado destes produtos nao esta disponivel.",
      });
    }

    if (!supermarket.deliveryMethods.includes(deliveryMethod)) {
      return res.status(400).json({
        error: "O supermercado selecionado nao suporta esse metodo de entrega.",
      });
    }

    const stockReservations = [];
    const items = [];
    let subtotalProdutos = 0;

    try {
      for (const selection of selections) {
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: selection.productId,
            supermarket: supermarket._id,
            stock: { $gte: selection.quantity },
          },
          { $inc: { stock: -selection.quantity } },
          { new: true },
        );

        if (!updatedProduct) {
          throw new Error(
            `Stock insuficiente para o produto ${selection.productId}.`,
          );
        }

        const precoUnitario = Number(updatedProduct.price);
        const subtotal = Number(
          (precoUnitario * selection.quantity).toFixed(2),
        );

        stockReservations.push({
          productId: updatedProduct._id,
          quantity: selection.quantity,
        });

        items.push({
          product: updatedProduct._id,
          nome: updatedProduct.name,
          precoUnitario,
          quantidade: selection.quantity,
          subtotal,
        });

        subtotalProdutos += subtotal;
      }
    } catch (error) {
      await rollbackStockReservations(stockReservations);
      return res.status(400).json({ error: error.message });
    }

    const custoEntrega =
      deliveryMethod === "estafeta" ? Number(supermarket.deliveryCost || 0) : 0;

    let couponData;

    try {
      couponData = await validateCouponForOrder(
        couponCode,
        supermarket,
        subtotalProdutos,
        custoEntrega,
      );
    } catch (error) {
      await rollbackStockReservations(stockReservations);
      return res.status(400).json({ error: error.message });
    }

    const total = Number(
      Math.max(
        0,
        subtotalProdutos + custoEntrega - couponData.discountApplied,
      ).toFixed(2),
    );

    try {
      const order = await Order.create({
        cliente: req.user.userId,
        supermercado: supermarket._id,
        items,
        total,
        subtotalProdutos,
        metodoEntrega: deliveryMethod,
        custoEntrega,
        coupon: couponData.coupon ? couponData.coupon._id : null,
        couponCode: couponData.couponCode,
        couponType: couponData.couponType,
        couponValue: couponData.couponValue,
        discountApplied: couponData.discountApplied,
        estado: "confirmada",
        paymentStatus: "pending",
      });

      await registerCouponUsage(
        couponData.coupon ? couponData.coupon._id : null,
      );
      await sendCreationEmail(order._id);

      const populatedOrder = await Order.findById(order._id)
        .populate("supermercado", "name")
        .populate("items.product", "image");

      return res.status(201).json(mapOrderForClient(populatedOrder));
    } catch (error) {
      await rollbackStockReservations(stockReservations);
      return res.status(500).json({ error: "Erro ao criar a encomenda." });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/dashboard/client:
 *   get:
 *     summary: Dashboard do cliente autenticado
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do dashboard
 */
router.get(
  "/dashboard/client",
  requireJWT,
  requireClientJWT,
  async (req, res) => {
    try {
      const orders = await Order.find({ cliente: req.user.userId })
        .populate("supermercado", "name")
        .sort({ createdAt: -1 });

      return res.json(buildDashboardStatsForOrders(orders));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
);

/**
 * @swagger
 * /api/payments/checkout/{orderId}:
 *   post:
 *     summary: Cria uma Checkout Session Stripe para uma encomenda do cliente
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: URL de checkout criada
 */
router.post(
  "/payments/checkout/:orderId",
  requireJWT,
  requireClientJWT,
  async (req, res) => {
    try {
      const stripe = getStripeClient();

      if (!stripe) {
        return res.status(500).json({
          error: "Stripe nao esta configurado no servidor.",
        });
      }

      const order = await Order.findOne({
        _id: req.params.orderId,
        cliente: req.user.userId,
      })
        .populate("cliente", "email")
        .populate("supermercado", "name");

      if (!order) {
        return res.status(404).json({ error: "Encomenda nao encontrada." });
      }

      if (order.estado === "cancelada") {
        return res
          .status(400)
          .json({ error: "Nao podes pagar uma encomenda cancelada." });
      }

      if (order.paymentStatus === "paid") {
        return res.status(400).json({ error: "Esta encomenda ja esta paga." });
      }

      const amount = toStripeAmount(order.total);

      if (amount <= 0) {
        return res
          .status(400)
          .json({ error: "O valor da encomenda nao e valido para pagamento." });
      }

      const frontendBaseUrl = getFrontendBaseUrl();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: String(order._id),
        customer_email: order.cliente ? order.cliente.email : undefined,
        locale: "pt",
        success_url: `${frontendBaseUrl}/orders/${order._id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendBaseUrl}/orders/${order._id}?payment=canceled`,
        metadata: {
          orderId: String(order._id),
          customerId: String(req.user.userId),
        },
        payment_intent_data: {
          metadata: {
            orderId: String(order._id),
          },
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: amount,
              product_data: {
                name: `Encomenda #${formatOrderDisplayId(order._id)}`,
                description: `Pagamento da encomenda no supermercado ${
                  order.supermercado ? order.supermercado.name : "Marketplace"
                }`,
              },
            },
          },
        ],
      });

      order.stripeCheckoutSessionId = session.id;
      order.paymentStatus = "pending";
      await order.save();

      return res.json({ checkoutUrl: session.url });
    } catch (error) {
      console.error("Erro ao iniciar checkout Stripe pela API:", error);
      return res
        .status(500)
        .json({ error: "Erro ao iniciar o pagamento da encomenda." });
    }
  },
);

/**
 * @swagger
 * /api/payments/confirm/{sessionId}:
 *   get:
 *     summary: Confirma uma sessao Stripe apos regresso ao frontend
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pagamento confirmado
 */
router.get(
  "/payments/confirm/:sessionId",
  requireJWT,
  requireClientJWT,
  async (req, res) => {
    try {
      const stripe = getStripeClient();

      if (!stripe) {
        return res.status(500).json({
          error: "Stripe nao esta configurado no servidor.",
        });
      }

      const session = await stripe.checkout.sessions.retrieve(
        req.params.sessionId,
      );
      const order = await findOrderForSession(session);

      if (!order || String(order.cliente) !== String(req.user.userId)) {
        return res.status(404).json({ error: "Encomenda nao encontrada." });
      }

      if (session.payment_status === "paid") {
        await markOrderAsPaid(order, session);
      }

      const populatedOrder = await Order.findById(order._id)
        .populate("supermercado", "name")
        .populate("items.product", "image");

      return res.json(mapOrderForClient(populatedOrder));
    } catch (error) {
      console.error("Erro ao confirmar sessao Stripe pela API:", error);
      return res.status(500).json({ error: "Erro ao confirmar o pagamento." });
    }
  },
);

/**
 * @swagger
 * /api/couriers/{id}/reviews:
 *   get:
 *     summary: Lista as reviews de um estafeta
 *     tags: [Estafetas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do estafeta
 *     responses:
 *       200:
 *         description: Reviews do estafeta
 *       404:
 *         description: Estafeta não encontrado
 */
router.get("/couriers/:id/reviews", requireJWT, requireClientJWT, async (req, res) => {
  try {
    const courier = await User.findOne({ _id: req.params.id, role: "estafeta" }).select("name");

    if (!courier) {
      return res.status(404).json({ error: "Estafeta não encontrado." });
    }

    const reviewedOrders = await Order.find({
      estafeta: courier._id,
      "avaliacaoEstafeta.rating": { $exists: true },
    })
      .populate("cliente", "name")
      .sort({ updatedAt: -1 });

    const reviews = reviewedOrders.map((order) => ({
      orderId: String(order._id),
      displayId: formatOrderDisplayId(order._id),
      customerName: order.cliente ? order.cliente.name : "Cliente",
      rating: Number(order.avaliacaoEstafeta.rating || 0),
      comment: order.avaliacaoEstafeta.comentario || "",
      createdAt: order.updatedAt || order.createdAt,
    }));

    const averageRating = reviews.length
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : 0;

    return res.json({
      courier: { id: String(courier._id), name: courier.name },
      averageRating,
      totalReviews: reviews.length,
      reviews,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});



/**
 * @swagger
 * /api/supermarkets/{id}/couriers:
 *   get:
 *     summary: Lista os estafetas de um supermercado
 *     tags: [Supermercados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do supermercado
 *     responses:
 *       200:
 *         description: Estafetas do supermercado
 *       404:
 *         description: Supermercado não encontrado
 */
router.get("/supermarkets/:id/couriers", requireJWT, requireClientJWT, async (req, res) => {
  try {
    const supermarket = await Supermarket.findOne({ _id: req.params.id, isApproved: true }).select("name location");

    if (!supermarket) {
      return res.status(404).json({ error: "Supermercado não encontrado." });
    }

    const orders = await Order.find({
      supermercado: supermarket._id,
      estafeta: { $ne: null },
      "avaliacaoEstafeta.rating": { $exists: true },
    }).populate("cliente", "name");

    const courierMap = new Map();

    for (const order of orders) {
      const courierId = String(order.estafeta);
      if (!courierMap.has(courierId)) {
        courierMap.set(courierId, {
          courierId,
          courierName: order.nomeEstafeta || "Estafeta",
          reviews: [],
        });
      }
      courierMap.get(courierId).reviews.push({
        orderId: String(order._id),
        displayId: formatOrderDisplayId(order._id),
        customerName: order.cliente ? order.cliente.name : "Cliente",
        rating: Number(order.avaliacaoEstafeta.rating || 0),
        comment: order.avaliacaoEstafeta.comentario || "",
        createdAt: order.updatedAt || order.createdAt,
      });
    }

    const couriers = [...courierMap.values()].map((c) => ({
      courierId: c.courierId,
      courierName: c.courierName,
      totalReviews: c.reviews.length,
      averageRating: Number(
        (c.reviews.reduce((sum, r) => sum + r.rating, 0) / c.reviews.length).toFixed(1)
      ),
      reviews: c.reviews,
    }));

    return res.json({ supermarket: { id: String(supermarket._id), name: supermarket.name }, couriers });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


module.exports = router;
module.exports.requireJWT = requireJWT;
