var express = require("express");
var router = express.Router();
const crypto = require("crypto");

const Order = require("../models/Order");
const Product = require("../models/Product");
const Supermarket = require("../models/Supermarket");
const User = require("../models/User");
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

function normalizeRawItems(rawItems) {
  if (!rawItems) {
    return [];
  }

  const items = Array.isArray(rawItems) ? rawItems : Object.values(rawItems);

  return items.map((item) => ({
    productId: normalizeText(firstValue(item && item.productId, item && item.product)),
    quantity: Number(
      firstValue(item && item.quantity, item && item.quantidade, 0),
    ),
    selected:
      Boolean(
        item &&
          firstValue(item.selected, item.selecionado, item.checked),
      ) &&
      ["1", "true", "on"].includes(
        String(firstValue(item.selected, item.selecionado, item.checked)).toLowerCase(),
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
    customerType: normalizeText(body.customerType || "novo"), // NOVO
    existingCustomerId: normalizeText(body.existingCustomerId), // NOVO
    customer: {
      name: normalizeText(
        firstValue(body.name, body.nome, body.customerName),
      ),
      email: normalizeEmail(firstValue(body.email, body.customerEmail)),
      address: normalizeText(
        firstValue(body.address, body.morada, body.customerAddress),
      ),
      phone: normalizePhone(
        firstValue(
          body.phone,
          body.telephone,
          body.telefone,
          body.customerPhone,
        ),
      ),
    },
    deliveryMethod: normalizeText(
      firstValue(body.metodoEntrega, body.deliveryMethod, body.metodo),
    ),
    quantities,
    selectedProductIds,
  };
}

function buildCreateViewModel(
  supermarket,
  products,
  customers, // NOVO PARÂMETRO AQUI
  formData = {},
  errorMessage = null,
) {
  return {
    supermarket,
    products,
    customers, // PASSAR PARA O EJS
    errorMessage,
    customerType: formData.customerType || "novo",
    existingCustomerId: formData.existingCustomerId || "",
    customer: formData.customer || {},
    quantities: formData.quantities || {},
    selectedProductIds: formData.selectedProductIds || [],
    deliveryMethod:
      formData.deliveryMethod ||
      supermarket.deliveryMethods[0] ||
      "levantamento_loja",
    deliveryLabels: DELIVERY_METHOD_LABELS,
  };
}

async function renderCreatePage(
  res,
  supermarket,
  formData = {},
  errorMessage = null,
  statusCode = 200,
) {
  const products = await Product.find({ supermarket: supermarket._id }).sort({
    name: 1,
  });

  const customers = await User.find({ role: "cliente" }).sort({ name: 1 });

  return res
    .status(statusCode)
    .render(
      "orders/create",
      buildCreateViewModel(
        supermarket,
        products,
        customers,
        formData,
        errorMessage,
      ),
    );
}

async function getManagedSupermarkets(userId) {
  return Supermarket.find({ manager: userId }).sort({ name: 1 });
}

async function getCreateSupermarket(req, supermarketId) {
  const supermarket = await Supermarket.findById(supermarketId);

  if (!supermarket) {
    return { error: { status: 404, message: "Supermercado nao encontrado." } };
  }

  if (
    req.session.role !== "admin" &&
    String(supermarket.manager) !== String(req.session.userId)
  ) {
    return {
      error: {
        status: 403,
        message: "Nao pode registar vendas para este supermercado.",
      },
    };
  }

  if (!supermarket.isApproved) {
    return {
      error: {
        status: 403,
        message: "O supermercado ainda nao esta aprovado para operar.",
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
  const userByPhone = await User.findOne({
    $or: [{ phone }, { telephone: phone }],
  });

  if (
    userByEmail &&
    userByPhone &&
    String(userByEmail._id) !== String(userByPhone._id)
  ) {
    throw new Error(
      "Ja existe um utilizador com este email e outro com este telefone.",
    );
  }

  const customer = userByEmail || userByPhone;

  if (customer) {
    if (customer.role !== "cliente") {
      throw new Error(
        "Os dados inseridos pertencem a um utilizador que nao e cliente.",
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

    if (customer.phone !== phone) {
      customer.phone = phone;
      hasChanges = true;
    }

    if (customer.email !== email) {
      customer.email = email;
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
        stock: { $gte: selection.quantity },
      },
      { $inc: { stock: -selection.quantity } },
      { new: true },
    );

    if (!updatedProduct) {
      await rollbackStockReservations(stockReservations);
      throw new Error("Stock insuficiente ou produto invalido.");
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

async function buildOrderAccessFilter(req) {
  if (req.session.role === "admin") {
    return {};
  }

  if (req.session.role === "supermercado") {
    const supermarkets = await getManagedSupermarkets(req.session.userId);

    return {
      supermercado: { $in: supermarkets.map((supermarket) => supermarket._id) },
    };
  }

  return {
    metodoEntrega: "estafeta",
    $or: [
      { estafeta: req.session.userId },
      { estado: { $in: ["confirmada", "em_preparacao"] }, estafeta: null },
    ],
  };
}

async function canAccessOrder(req, order) {
  if (req.session.role === "admin") {
    return true;
  }

  if (req.session.role === "supermercado") {
    const supermarket = await Supermarket.findOne({
      _id: order.supermercado,
      manager: req.session.userId,
    }).select("_id");

    return Boolean(supermarket);
  }

  if (req.session.role !== "estafeta") {
    return false;
  }

  if (order.metodoEntrega !== "estafeta") {
    return false;
  }

  if (!order.estafeta) {
    return ["confirmada", "em_preparacao"].includes(order.estado);
  }

  return String(order.estafeta) === String(req.session.userId);
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
      if (order.metodoEntrega === "levantamento_loja") {
        transitions.push("entregue");
      }

      if (order.metodoEntrega === "estafeta" && order.estafeta) {
        transitions.push("em_entrega");
      }

      transitions.push("cancelada");
    }

    if (order.estado === "em_entrega") {
      transitions.push("entregue");
    }
  }

  if (role === "estafeta" && order.metodoEntrega === "estafeta") {
    if (!order.estafeta && order.estado === "em_preparacao") {
      transitions.push("em_entrega");
    }

    if (
      order.estafeta &&
      String(order.estafeta) === String(userId) &&
      order.estado === "em_entrega"
    ) {
      transitions.push("entregue");
    }
  }

  return transitions;
}

router.use(requireAuth);

router.get(
  "/create/:supermarketId",
  requireRole(["admin", "supermercado"]),
  async function (req, res) {
    try {
      const result = await getCreateSupermarket(req, req.params.supermarketId);

      if (result.error) {
        return res.status(result.error.status).send(result.error.message);
      }

      return renderCreatePage(res, result.supermarket);
    } catch (error) {
      console.error("Erro ao abrir formulario de venda:", error);
      return res.status(500).send("Erro ao abrir formulario de venda.");
    }
  },
);

router.post(
  "/create/:supermarketId",
  requireRole(["admin", "supermercado"]),
  async function (req, res) {
    try {
      const result = await getCreateSupermarket(req, req.params.supermarketId);
      const rawItems = extractRawItems(req.body);
      const formData = buildFormData(req.body, rawItems);

      if (result.error) {
        return res.status(result.error.status).send(result.error.message);
      }

      const supermarket = result.supermarket;

      if (!supermarket.deliveryMethods.includes(formData.deliveryMethod)) {
        return renderCreatePage(
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

      if (selections.length === 0) {
        return renderCreatePage(
          res,
          supermarket,
          formData,
          "Tem de selecionar pelo menos um produto.",
          400,
        );
      }

      let customer;

      try {
        // LÓGICA NOVA: Verificar que tipo de cliente o operador escolheu
        if (formData.customerType === "existente") {
          if (!formData.existingCustomerId) {
            throw new Error("Selecione um cliente existente na lista.");
          }

          customer = await User.findById(formData.existingCustomerId);

          if (!customer || customer.role !== "cliente") {
            throw new Error("O cliente selecionado não é válido.");
          }
        } else {
          // Mantém a lógica original para clientes novos
          customer = await findOrCreateCustomer(formData.customer);
        }
      } catch (customerError) {
        return renderCreatePage(
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
          res,
          supermarket,
          formData,
          reservationError.message,
          400,
        );
      }

      let custoEntrega = 0;
      if (formData.deliveryMethod === "estafeta") {
        custoEntrega = supermarket.deliveryCost || 0;
      }

      const total = reservation.totalProdutos + custoEntrega;

      try {
        const order = await Order.create({
          cliente: customer._id,
          supermercado: supermarket._id,
          items: reservation.items,
          total,
          metodoEntrega: formData.deliveryMethod,
          custoEntrega,
          estado: "confirmada",
        });

        return res.redirect(`/orders/${order._id}`);
      } catch (creationError) {
        await rollbackStockReservations(reservation.stockReservations);
        throw creationError;
      }
    } catch (error) {
      console.error("Erro completo ao registar venda:", error);
      return res.status(500).send("Erro ao registar venda.");
    }
  },
);

router.get(
  "/",
  requireRole(["admin", "supermercado", "estafeta"]),
  async function (req, res) {
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

      if (req.session.role !== "estafeta" && req.query.supermarketId) {
        const selectedSupermarket = supermarkets.find(
          (supermarket) =>
            String(supermarket._id) === String(req.query.supermarketId),
        );

        if (!selectedSupermarket) {
          return res
            .status(403)
            .send("Nao pode consultar encomendas deste supermercado.");
        }

        query.supermercado = selectedSupermarket._id;
      }

      if (req.query.status && ORDER_STATUS_LABELS[req.query.status]) {
        query.estado = req.query.status;
      }

      const orders = await Order.find(query)
        .populate("cliente", "name email phone telephone")
        .populate("supermercado", "name")
        .populate("estafeta", "name email")
        .sort({ createdAt: -1 });

      return res.render("orders/index", {
        orders,
        supermarkets,
        filters: {
          status: req.query.status || "",
          supermarketId: req.query.supermarketId || "",
        },
        role: req.session.role,
        statusLabels: ORDER_STATUS_LABELS,
        deliveryLabels: DELIVERY_METHOD_LABELS,
      });
    } catch (error) {
      console.error("Erro ao listar encomendas:", error);
      return res.status(500).send("Erro ao listar encomendas.");
    }
  },
);

router.get(
  "/:id",
  requireRole(["admin", "supermercado", "estafeta"]),
  async function (req, res) {
    try {
      const order = await Order.findById(req.params.id)
        .populate("cliente", "name email address phone telephone")
        .populate("supermercado", "name location")
        .populate("items.product")
        .populate("estafeta", "name email");

      if (!order) {
        return res.status(404).send("Encomenda nao encontrada.");
      }

      if (!(await canAccessOrder(req, order))) {
        return res.status(403).send("Nao pode consultar esta encomenda.");
      }

      return res.render("orders/show", {
        order,
        role: req.session.role,
        statusLabels: ORDER_STATUS_LABELS,
        deliveryLabels: DELIVERY_METHOD_LABELS,
        allowedTransitions: getAllowedTransitions(
          order,
          req.session.role,
          req.session.userId,
        ),
      });
    } catch (error) {
      console.error("Erro ao carregar encomenda:", error);
      return res.status(500).send("Erro ao carregar encomenda.");
    }
  },
);

router.post("/:id/claim", requireRole(["estafeta"]), async function (req, res) {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send("Encomenda nao encontrada.");
    }

    if (order.metodoEntrega !== "estafeta") {
      return res.status(400).send("Esta encomenda nao precisa de estafeta.");
    }

    if (order.estado !== "em_preparacao") {
      return res
        .status(400)
        .send(
          "A entrega so pode ser aceite quando a encomenda esta em preparacao.",
        );
    }

    if (
      order.estafeta &&
      String(order.estafeta) !== String(req.session.userId)
    ) {
      return res
        .status(403)
        .send("Esta entrega ja foi aceite por outro estafeta.");
    }

    order.estafeta = req.session.userId;
    order.estado = "em_entrega";
    await order.save();

    return res.redirect(`/orders/${order._id}`);
  } catch (error) {
    console.error("Erro ao aceitar entrega:", error);
    return res.status(500).send("Erro ao aceitar entrega.");
  }
});

router.post(
  "/:id/status",
  requireRole(["admin", "supermercado", "estafeta"]),
  async function (req, res) {
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
        !order.estafeta
      ) {
        order.estafeta = req.session.userId;
      }

      order.estado = nextStatus;

      if (nextStatus === "cancelada" && previousStatus !== "cancelada") {
        await restoreOrderStock(order);
      }

      await order.save();

      return res.redirect(`/orders/${order._id}`);
    } catch (error) {
      console.error("Erro ao atualizar estado da encomenda:", error);
      return res.status(500).send("Erro ao atualizar estado da encomenda.");
    }
  },
);

module.exports = router;
