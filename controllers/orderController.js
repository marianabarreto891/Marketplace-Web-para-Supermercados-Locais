const crypto = require("crypto");

const Category = require("../models/Category");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Supermarket = require("../models/Supermarket");
const User = require("../models/User");
const { sendOrderStatusEmail } = require("../services/orderEmailService");

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

const PAYMENT_STATUS_LABELS = {
  pending: "Por pagar",
  paid: "Pago",
  failed: "Falhou",
  canceled: "Pagamento cancelado",
};

const COURIER_DELIVERY_METHODS = [
  "estafeta",
  "Entrega por estafeta",
  "entrega_por_estafeta",
];

function normalizeText(value) {
  return String(value || "").trim();
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value) {
  return normalizeText(value);
}

function normalizeCouponCode(value) {
  return normalizeText(value).toUpperCase();
}

function normalizeRawItems(rawItems) {
  if (!rawItems) {
    return [];
  }

  const items = Array.isArray(rawItems) ? rawItems : Object.values(rawItems);

  return items.map((item) => ({
    productId: normalizeText(firstValue(item && item.productId, item && item.product)),
    quantity: Number(firstValue(item && item.quantity, item && item.quantidade, 0)),
    selected:
      Boolean(item && firstValue(item.selected, item.selecionado, item.checked)) &&
      ["1", "true", "on"].includes(
        String(firstValue(item && item.selected, item && item.selecionado, item && item.checked)).toLowerCase(),
      ),
  }));
}

function extractRawItems(body) {
  if (body.items) {
    return normalizeRawItems(body.items);
  }

  const indexedItems = {};

  Object.entries(body || {}).forEach(([key, value]) => {
    const match = key.match(/^items\[(\d+)\]\[(\w+)\]$/);

    if (!match) {
      return;
    }

    const [, index, field] = match;

    if (!indexedItems[index]) {
      indexedItems[index] = {};
    }

    indexedItems[index][field] = value;
  });

  return normalizeRawItems(Object.values(indexedItems));
}

function buildFormData(body, rawItems) {
  const quantities = {};
  const selectedProductIds = [];

  rawItems.forEach((item) => {
    if (!item.productId) {
      return;
    }

    quantities[item.productId] =
      Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;

    if (item.selected) {
      selectedProductIds.push(item.productId);
    }
  });

  return {
    customerType: normalizeText(body.customerType || "novo"),
    existingCustomerId: normalizeText(body.existingCustomerId),
    customer: {
      name: normalizeText(firstValue(body.name, body.nome, body.customerName)),
      email: normalizeEmail(firstValue(body.email, body.customerEmail)),
      address: normalizeText(
        firstValue(body.address, body.morada, body.customerAddress),
      ),
      phone: normalizePhone(
        firstValue(
          body.phone,
          body.telefone,
          body.customerPhone,
        ),
      ),
    },
    deliveryMethod: normalizeText(
      firstValue(body.metodoEntrega, body.deliveryMethod, body.metodo),
    ),
    couponCode: normalizeCouponCode(firstValue(body.couponCode, body.coupon)),
    quantities,
    selectedProductIds,
  };
}

function buildCreateViewModel(
  supermarket,
  products,
  customers,
  formData = {},
  errorMessage = null,
) {
  return {
    supermarket,
    products,
    customers,
    errorMessage,
    customerType: formData.customerType || "novo",
    existingCustomerId: formData.existingCustomerId || "",
    customer: formData.customer || {},
    quantities: formData.quantities || {},
    selectedProductIds: formData.selectedProductIds || [],
    couponCode: formData.couponCode || "",
    deliveryMethod:
      formData.deliveryMethod ||
      supermarket.deliveryMethods[0] ||
      "levantamento_loja",
    deliveryLabels: DELIVERY_METHOD_LABELS,
    role: "supermercado",
  };
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

    order.estafetaUser = courier || null;
    order.estafetaDisplayName = courier
      ? courier.name
      : courierId
      ? order.nomeEstafeta || "Estafeta removido"
      : "-";
  });

  return orderInput;
}

function getOrderCustomerId(order) {
  if (!order || !order.cliente) {
    return null;
  }

  return order.cliente._id ? order.cliente._id : order.cliente;
}

function getOrderSupermarketId(order) {
  if (!order || !order.supermercado) {
    return null;
  }

  return order.supermercado._id ? order.supermercado._id : order.supermercado;
}

function deliveryNeedsCourier(order) {
  const value = normalizeText(order && order.metodoEntrega).toLowerCase();
  return COURIER_DELIVERY_METHODS.map((item) => item.toLowerCase()).includes(
    value,
  );
}

function getDashboardPathForRole(role) {
  if (role === "supermercado") {
    return "/supermarket/dashboard";
  }

  if (role === "estafeta") {
    return "/courier/dashboard";
  }

  if (role === "admin") {
    return "/admin/dashboard";
  }

  return "/supermarket/list";
}

function redirectToOrderDetail(res, orderId) {
  return res.redirect(`/orders/${orderId}?updated=${Date.now()}`);
}

async function notifyOrderStatusChange(orderId, previousStatus, nextStatus) {
  try {
    const order = await Order.findById(orderId)
      .populate("cliente", "name email")
      .populate("supermercado", "name");

    if (!order) {
      return;
    }

    await attachCourierMetadata(order);
    await sendOrderStatusEmail(order, previousStatus, nextStatus);
  } catch (error) {
    console.error("Erro ao enviar notificação por email da encomenda:", error);
  }
}

async function renderCreatePage(
  req,
  res,
  supermarket,
  formData = {},
  errorMessage = null,
  statusCode = 200,
) {
  const query = {
    supermarket: supermarket._id,
    isActive: { $ne: false },
  };

  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: "i" };
  }

  if (req.query.category && req.query.category !== "all") {
    const category = await Category.findOne({ name: req.query.category });
    if (category) {
      query.category = category._id;
    }
  }

  const products = await Product.find(query).populate("category").sort({ name: 1 });
  const customers = await User.find({ role: "cliente" }).sort({ name: 1 });
  const categories = await Category.find().sort({ name: 1 });

  const viewModel = buildCreateViewModel(
    supermarket,
    products,
    customers,
    formData,
    errorMessage,
  );

  viewModel.categories = categories;
  viewModel.selectedCategory = req.query.category || "all";
  viewModel.searchQuery = req.query.search || "";

  return res.status(statusCode).render("orders/create", viewModel);
}

async function getManagedSupermarkets(userId) {
  return Supermarket.find({ manager: userId }).sort({ name: 1 });
}

async function getCreateSupermarket(req, supermarketId) {
  const supermarket = await Supermarket.findById(supermarketId);

  if (!supermarket) {
    return { error: { status: 404, message: "Supermercado não encontrado!" } };
  }

  if (
    req.session.role !== "admin" &&
    String(supermarket.manager) !== String(req.session.userId)
  ) {
    return {
      error: {
        status: 403,
        message: "Não pode registar vendas para este supermercado.",
      },
    };
  }

  if (!supermarket.isApproved) {
    return {
      error: {
        status: 403,
        message: "O supermercado ainda não está aprovado para operar.",
      },
    };
  }

  return { supermarket };
}

async function findOrCreateCustomer(customerData) {
  const email = normalizeEmail(customerData.email);
  const phone = normalizePhone(customerData.phone);
  const name = normalizeText(customerData.name);
  const address = normalizeText(customerData.address);

  if (!name || !email || !address || !phone) {
    throw new Error("Preencha os dados do cliente.");
  }

  const userByEmail = await User.findOne({ email });
  const userByPhone = await User.findOne({ phone });

  if (
    userByEmail &&
    userByPhone &&
    String(userByEmail._id) !== String(userByPhone._id)
  ) {
    throw new Error(
      "Já existe um utilizador com este email e outro com este telefone.",
    );
  }

  const customer = userByEmail || userByPhone;

  if (customer) {
    if (customer.role !== "cliente") {
      throw new Error(
        "Os dados inseridos pertencem a um utilizador que não é cliente.",
      );
    }

    let hasChanges = false;

    if (customer.name !== name) {
      customer.name = name;
      hasChanges = true;
    }

    if (customer.address !== address) {
      customer.address = address;
      hasChanges = true;
    }

    if (customer.email !== email) {
      customer.email = email;
      hasChanges = true;
    }

    if (customer.phone !== phone) {
      customer.phone = phone;
      hasChanges = true;
    }

    if (!customer.isApproved) {
      customer.isApproved = true;
      hasChanges = true;
    }

    if (hasChanges) {
      await customer.save();
    }

    return customer;
  }

  return User.create({
    name,
    email,
    password: crypto.randomBytes(16).toString("hex"),
    address,
    phone,
    role: "cliente",
    isApproved: true,
  });
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

async function releaseCouponUsage(order) {
  if (!order || !order.coupon) {
    return;
  }

  await Coupon.findOneAndUpdate(
    { _id: order.coupon, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } },
  );
}

async function rollbackStockReservations(stockReservations) {
  for (const reservation of stockReservations) {
    await Product.findByIdAndUpdate(reservation.productId, {
      $inc: { stock: reservation.quantity },
    });
  }
}

async function reserveStock(supermarketId, selections) {
  const stockReservations = [];
  const items = [];
  let totalProdutos = 0;

  for (const selection of selections) {
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: selection.productId,
        supermarket: supermarketId,
        isActive: { $ne: false },
        stock: { $gte: selection.quantity },
      },
      { $inc: { stock: -selection.quantity } },
      { new: true },
    );

    if (!updatedProduct) {
      await rollbackStockReservations(stockReservations);
      throw new Error(
        `Stock insuficiente para o produto ${selection.productId} ou produto invalido.`,
      );
    }

    const precoUnitario = Number(updatedProduct.price);
    const subtotal = precoUnitario * selection.quantity;

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

    totalProdutos += subtotal;
  }

  return { items, totalProdutos, stockReservations };
}

async function restoreOrderStock(order) {
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantidade },
    });
  }
}

async function courierHasActiveDelivery(courierId, exceptOrderId = null) {
  const query = {
    estafeta: courierId,
    estado: "em_entrega",
  };

  if (exceptOrderId) {
    query._id = { $ne: exceptOrderId };
  }

  return Boolean(await Order.findOne(query).select("_id"));
}

async function getCourierSnapshotName(userId) {
  const courier = await User.findById(userId).select("name").lean();
  return courier ? courier.name : "";
}

async function buildOrderAccessFilter(req) {
  if (req.session.role === "admin") {
    return {};
  }

  if (req.session.role === "cliente") {
    return { cliente: req.session.userId };
  }

  if (req.session.role === "supermercado") {
    const supermarkets = await getManagedSupermarkets(req.session.userId);

    return {
      supermercado: { $in: supermarkets.map((supermarket) => supermarket._id) },
    };
  }

  return {
    $or: [
      { estafeta: req.session.userId },
      {
        metodoEntrega: { $in: COURIER_DELIVERY_METHODS },
        estado: { $in: ["confirmada", "em_preparacao"] },
        estafeta: null,
      },
    ],
  };
}

async function canAccessOrder(req, order) {
  if (req.session.role === "admin") {
    return true;
  }

  if (req.session.role === "cliente") {
    return String(getOrderCustomerId(order)) === String(req.session.userId);
  }

  if (req.session.role === "supermercado") {
    const supermarket = await Supermarket.findOne({
      _id: getOrderSupermarketId(order),
      manager: req.session.userId,
    }).select("_id");

    return Boolean(supermarket);
  }

  if (req.session.role !== "estafeta") {
    return false;
  }

  const courierId = getOrderCourierId(order);

  if (courierId) {
    return String(courierId) === String(req.session.userId);
  }

  return (
    deliveryNeedsCourier(order) &&
    ["confirmada", "em_preparacao"].includes(order.estado)
  );
}

function getAllowedTransitions(order, role, userId) {
  if (["cancelada", "entregue"].includes(order.estado)) {
    return [];
  }

  const transitions = [];

  if (role === "admin" || role === "supermercado") {
    if (order.estado === "pendente") {
      transitions.push("confirmada", "cancelada");
    }

    if (order.estado === "confirmada") {
      transitions.push("em_preparacao", "cancelada");
    }

    if (order.estado === "em_preparacao") {
      if (!deliveryNeedsCourier(order)) {
        transitions.push("entregue");
      }

      transitions.push("cancelada");
    }

    if (order.estado === "em_entrega") {
      transitions.push("entregue");
    }
  }

  if (role === "estafeta" && deliveryNeedsCourier(order)) {
    const courierId = getOrderCourierId(order);

    if (!courierId && order.estado === "em_preparacao") {
      transitions.push("em_entrega");
    }

    if (
      courierId &&
      String(courierId) === String(userId) &&
      order.estado === "em_entrega"
    ) {
      transitions.push("entregue");
    }
  }

  return transitions;
}

exports.renderCreateForm = async (req, res) => {
  try {
    const result = await getCreateSupermarket(req, req.params.supermarketId);

    if (result.error) {
      return res.status(result.error.status).send(result.error.message);
    }

    return renderCreatePage(req, res, result.supermarket);
  } catch (error) {
    console.error("Erro ao abrir formulario de venda:", error);
    return res.status(500).send("Erro ao abrir formulario de venda.");
  }
};

exports.createOrder = async (req, res) => {
  try {
    const result = await getCreateSupermarket(req, req.params.supermarketId);

    if (result.error) {
      return res.status(result.error.status).send(result.error.message);
    }

    const supermarket = result.supermarket;
    const rawItems = extractRawItems(req.body);
    const formData = buildFormData(req.body, rawItems);

    if (!supermarket.deliveryMethods.includes(formData.deliveryMethod)) {
      return renderCreatePage(
        req,
        res,
        supermarket,
        formData,
        "Selecione um metodo de entrega valido.",
        400,
      );
    }

    const selectionMap = new Map();

    for (const item of rawItems) {
      if (!item.selected) {
        continue;
      }

      if (
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        return renderCreatePage(
          req,
          res,
          supermarket,
          formData,
          "Selecione produtos com quantidades validas.",
          400,
        );
      }

      const currentQuantity = selectionMap.get(item.productId) || 0;
      selectionMap.set(item.productId, currentQuantity + item.quantity);
    }

    const selections = Array.from(selectionMap.entries()).map(
      ([productId, quantity]) => ({
        productId,
        quantity,
      }),
    );

    if (!selections.length) {
      return renderCreatePage(
        req,
        res,
        supermarket,
        formData,
        "Tem de selecionar pelo menos um produto.",
        400,
      );
    }

    let customer;

    try {
      if (formData.customerType === "existente") {
        if (!formData.existingCustomerId) {
          throw new Error("Selecione um cliente existente na lista.");
        }

        customer = await User.findById(formData.existingCustomerId);

        if (!customer || customer.role !== "cliente") {
          throw new Error("O cliente selecionado nao e valido.");
        }
      } else {
        customer = await findOrCreateCustomer(formData.customer);
      }
    } catch (customerError) {
      return renderCreatePage(
        req,
        res,
        supermarket,
        formData,
        customerError.message,
        400,
      );
    }

    let reservation;

    try {
      reservation = await reserveStock(supermarket._id, selections);
    } catch (reservationError) {
      return renderCreatePage(
        req,
        res,
        supermarket,
        formData,
        reservationError.message,
        400,
      );
    }

    const subtotalProdutos = reservation.totalProdutos;
    const custoEntrega =
      formData.deliveryMethod === "estafeta" ? supermarket.deliveryCost || 0 : 0;

    let couponData;

    try {
      couponData = await validateCouponForOrder(
        formData.couponCode,
        supermarket,
        subtotalProdutos,
        custoEntrega,
      );
    } catch (couponError) {
      await rollbackStockReservations(reservation.stockReservations);
      return renderCreatePage(
        req,
        res,
        supermarket,
        formData,
        couponError.message,
        400,
      );
    }

    const total = Number(
      Math.max(
        0,
        subtotalProdutos + custoEntrega - couponData.discountApplied,
      ).toFixed(2),
    );

    try {
      const order = await Order.create({
        cliente: customer._id,
        supermercado: supermarket._id,
        items: reservation.items,
        subtotalProdutos,
        total,
        metodoEntrega: formData.deliveryMethod,
        custoEntrega,
        coupon: couponData.coupon ? couponData.coupon._id : null,
        couponCode: couponData.couponCode,
        couponType: couponData.couponType,
        couponValue: couponData.couponValue,
        discountApplied: couponData.discountApplied,
        estado: "confirmada",
      });

      try {
        await registerCouponUsage(couponData.coupon ? couponData.coupon._id : null);
      } catch (couponUsageError) {
        console.error("Erro ao registar utilizacao do cupao:", couponUsageError);
      }

      await notifyOrderStatusChange(order._id, null, order.estado);

      return redirectToOrderDetail(res, order._id);
    } catch (creationError) {
      await rollbackStockReservations(reservation.stockReservations);
      throw creationError;
    }
  } catch (error) {
    console.error("Erro completo ao registar venda:", error);
    return res.status(500).send("Erro ao registar venda.");
  }
};

exports.listOrders = async (req, res) => {
  try {
    const accessFilter = await buildOrderAccessFilter(req);
    const query = { ...accessFilter };
    let supermarkets = [];

    if (req.session.role === "admin") {
      supermarkets = await Supermarket.find().sort({ name: 1 });
    }

    if (req.session.role === "supermercado") {
      supermarkets = await getManagedSupermarkets(req.session.userId);
    }

    if (
      ["admin", "supermercado"].includes(req.session.role) &&
      req.query.supermarketId
    ) {
      const selectedSupermarket = supermarkets.find(
        (supermarket) =>
          String(supermarket._id) === String(req.query.supermarketId),
      );

      if (!selectedSupermarket) {
        return res
          .status(403)
          .send("Nao pode consultar as encomendas deste supermercado.");
      }

      query.supermercado = selectedSupermarket._id;
    }

    if (req.query.status && ORDER_STATUS_LABELS[req.query.status]) {
      query.estado = req.query.status;
    }

    const orders = await Order.find(query)
      .populate("cliente", "name email phone")
      .populate("supermercado", "name")
      .sort({ createdAt: -1 });

    await attachCourierMetadata(orders);

    const courierHasDeliveryInProgress =
      req.session.role === "estafeta"
        ? await courierHasActiveDelivery(req.session.userId)
        : false;

    return res.render("orders/index", {
      orders,
      supermarkets,
      filters: {
        status: req.query.status || "",
        supermarketId: req.query.supermarketId || "",
      },
      role: req.session.role,
      currentUserId: String(req.session.userId),
      courierHasDeliveryInProgress,
      statusLabels: ORDER_STATUS_LABELS,
      deliveryLabels: DELIVERY_METHOD_LABELS,
      dashboardPath: getDashboardPathForRole(req.session.role),
    });
  } catch (error) {
    console.error("Erro ao listar encomendas:", error);
    return res.status(500).send("Erro ao listar encomendas.");
  }
};

exports.showOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("cliente", "name email address phone")
      .populate("supermercado", "name location")
      .populate("items.product");

    if (!order) {
      return res.status(404).send("Encomenda nao encontrada.");
    }

    await attachCourierMetadata(order);

    if (!(await canAccessOrder(req, order))) {
      return res.status(403).send("Nao pode consultar esta encomenda.");
    }

    return res.render("orders/show", {
      order,
      role: req.session.role,
      currentUserId: String(req.session.userId),
      courierHasDeliveryInProgress:
        req.session.role === "estafeta"
          ? await courierHasActiveDelivery(req.session.userId, order._id)
          : false,
      statusLabels: ORDER_STATUS_LABELS,
      deliveryLabels: DELIVERY_METHOD_LABELS,
      paymentStatusLabels: PAYMENT_STATUS_LABELS,
      allowedTransitions: getAllowedTransitions(
        order,
        req.session.role,
        req.session.userId,
      ),
      dashboardPath: getDashboardPathForRole(req.session.role),
      paymentMessage: normalizeText(req.query.payment),
    });
  } catch (error) {
    console.error("Erro ao carregar encomenda:", error);
    return res.status(500).send("Erro ao carregar encomenda.");
  }
};

exports.claimOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send("Encomenda nao encontrada.");
    }

    if (!deliveryNeedsCourier(order)) {
      return res.status(400).send("Esta encomenda nao precisa de estafeta.");
    }

    if (order.estado !== "em_preparacao") {
      return res
        .status(400)
        .send(
          "A entrega so pode ser aceite quando a encomenda esta em preparacao.",
        );
    }

    const courierId = getOrderCourierId(order);

    if (courierId && String(courierId) !== String(req.session.userId)) {
      return res
        .status(403)
        .send("Esta entrega ja foi aceite por outro estafeta.");
    }

    if (
      (!courierId || String(courierId) !== String(req.session.userId)) &&
      (await courierHasActiveDelivery(req.session.userId, order._id))
    ) {
      return res
        .status(400)
        .send("So pode ter uma entrega em curso de cada vez.");
    }

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        estado: "em_preparacao",
        $or: [{ estafeta: null }, { estafeta: req.session.userId }],
      },
      {
        $set: {
          estafeta: req.session.userId,
          nomeEstafeta: await getCourierSnapshotName(req.session.userId),
          estado: "em_entrega",
        },
      },
      { new: true },
    );

    if (!updatedOrder) {
      return res
        .status(409)
        .send("A encomenda foi atualizada por outro utilizador. Tente novamente.");
    }

    await notifyOrderStatusChange(updatedOrder._id, order.estado, updatedOrder.estado);

    return redirectToOrderDetail(res, updatedOrder._id);
  } catch (error) {
    console.error("Erro ao aceitar entrega:", error);
    return res.status(500).send("Erro ao aceitar entrega.");
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send("Encomenda nao encontrada.");
    }

    if (!(await canAccessOrder(req, order))) {
      return res.status(403).send("Nao pode alterar esta encomenda.");
    }

    const nextStatus = normalizeText(req.body.estado);
    const allowedTransitions = getAllowedTransitions(
      order,
      req.session.role,
      req.session.userId,
    );

    if (!allowedTransitions.includes(nextStatus)) {
      return res.status(400).send("Transicao de estado invalida.");
    }

    const previousStatus = order.estado;

    if (
      req.session.role === "estafeta" &&
      nextStatus === "em_entrega" &&
      !getOrderCourierId(order)
    ) {
      if (await courierHasActiveDelivery(req.session.userId, order._id)) {
        return res
          .status(400)
          .send("So pode ter uma entrega em curso de cada vez.");
      }

      order.estafeta = req.session.userId;
      order.nomeEstafeta = await getCourierSnapshotName(req.session.userId);
    }

    order.estado = nextStatus;

    if (nextStatus === "cancelada" && previousStatus !== "cancelada") {
      await restoreOrderStock(order);
    }

    await order.save();

    if (nextStatus === "cancelada" && previousStatus !== "cancelada") {
      try {
        await releaseCouponUsage(order);
      } catch (couponReleaseError) {
        console.error(
          "Erro ao libertar utilizacao do cupao da encomenda cancelada:",
          couponReleaseError,
        );
      }
    }

    await notifyOrderStatusChange(order._id, previousStatus, nextStatus);

    return redirectToOrderDetail(res, order._id);
  } catch (error) {
    console.error("Erro ao atualizar o estado da encomenda:", error);
    return res.status(500).send("Erro ao atualizar o estado da encomenda.");
  }
};

exports.rateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send("Encomenda nao encontrada.");
    }

    if (String(order.cliente) !== String(req.session.userId)) {
      return res
        .status(403)
        .send("Nao tem permissao para avaliar esta encomenda.");
    }

    if (order.estado !== "entregue") {
      return res.status(400).send("So pode avaliar encomendas ja entregues.");
    }

    order.avaliacaoSupermercado = {
      rating: Number(req.body.ratingSupermarket),
      comentario: req.body.commentSupermarket,
    };

    if (deliveryNeedsCourier(order) && order.estafeta) {
      order.avaliacaoEstafeta = {
        rating: Number(req.body.ratingCourier),
        comentario: req.body.commentCourier,
      };
    }

    await order.save();
    return redirectToOrderDetail(res, order._id);
  } catch (error) {
    console.error("Erro ao avaliar:", error);
    return res.status(500).send("Erro ao processar a avaliacao.");
  }
};
