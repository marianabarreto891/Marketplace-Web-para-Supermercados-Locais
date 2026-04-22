const Stripe = require("stripe");

const Order = require("../models/Order");
const Supermarket = require("../models/Supermarket");

let stripeClient = null;

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

function getBaseUrl(req) {
  const configuredBaseUrl = String(process.env.APP_BASE_URL || "").trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

function formatOrderCode(orderId) {
  return String(orderId).slice(-6).toUpperCase();
}

function toStripeAmount(value) {
  return Math.round(Number(value || 0) * 100);
}

async function canAccessOrder(req, order) {
  if (req.session.role === "admin") {
    return true;
  }

  if (req.session.role === "cliente") {
    return String(order.cliente) === String(req.session.userId);
  }

  if (req.session.role === "supermercado") {
    const supermarket = await Supermarket.findOne({
      _id: order.supermercado,
      manager: req.session.userId,
    }).select("_id");

    return Boolean(supermarket);
  }

  return false;
}

async function markOrderAsPaid(order, session) {
  if (!order || order.paymentStatus === "paid") {
    return order;
  }

  order.paymentStatus = "paid";
  order.stripeCheckoutSessionId =
    (session && session.id) || order.stripeCheckoutSessionId || "";
  order.stripePaymentIntentId =
    (session &&
      session.payment_intent &&
      String(session.payment_intent)) ||
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

exports.createCheckoutSession = async (req, res) => {
  try {
    const stripe = getStripeClient();

    if (!stripe) {
      return res
        .status(500)
        .send("Stripe nao esta configurado. Defina STRIPE_SECRET_KEY no .env.");
    }

    const order = await Order.findById(req.params.orderId)
      .populate("cliente", "name email")
      .populate("supermercado", "name");

    if (!order) {
      return res.status(404).send("Encomenda nao encontrada.");
    }

    if (!(await canAccessOrder(req, order))) {
      return res.status(403).send("Nao pode pagar esta encomenda.");
    }

    if (order.estado === "cancelada") {
      return res.status(400).send("Nao pode pagar uma encomenda cancelada.");
    }

    if (order.paymentStatus === "paid") {
      return res.redirect(`/orders/${order._id}?payment=already_paid`);
    }

    const amount = toStripeAmount(order.total);

    if (amount <= 0) {
      return res
        .status(400)
        .send("O valor da encomenda nao e valido para pagamento.");
    }

    const orderCode = formatOrderCode(order._id);
    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: String(order._id),
      customer_email: order.cliente ? order.cliente.email : undefined,
      locale: "pt",
      success_url: `${baseUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payments/cancel?order_id=${order._id}`,
      metadata: {
        orderId: String(order._id),
        supermarketId: String(order.supermercado ? order.supermercado._id : ""),
        customerId: String(order.cliente ? order.cliente._id : ""),
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
              name: `Encomenda #${orderCode}`,
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

    return res.redirect(session.url);
  } catch (error) {
    console.error("Erro ao criar Checkout Session da Stripe:", error);
    return res.status(500).send("Erro ao iniciar o pagamento da encomenda.");
  }
};

exports.handleCheckoutSuccess = async (req, res) => {
  try {
    const stripe = getStripeClient();

    if (!stripe) {
      return res
        .status(500)
        .send("Stripe nao esta configurado. Defina STRIPE_SECRET_KEY no .env.");
    }

    const sessionId = String(req.query.session_id || "").trim();

    if (!sessionId) {
      return res.status(400).send("Sessao de pagamento invalida.");
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const order = await findOrderForSession(session);

    if (!order) {
      return res.status(404).send("Encomenda associada ao pagamento nao encontrada.");
    }

    if (!(await canAccessOrder(req, order))) {
      return res.status(403).send("Nao pode consultar esta encomenda.");
    }

    if (session.payment_status === "paid") {
      await markOrderAsPaid(order, session);
      return res.redirect(`/orders/${order._id}?payment=success`);
    }

    return res.redirect(`/orders/${order._id}?payment=pending`);
  } catch (error) {
    console.error("Erro ao confirmar pagamento da Stripe:", error);
    return res.status(500).send("Erro ao confirmar o pagamento.");
  }
};

exports.handleCheckoutCancel = async (req, res) => {
  try {
    const orderId = String(req.query.order_id || "").trim();

    if (!orderId) {
      return res.redirect("/orders");
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.redirect("/orders");
    }

    if (!(await canAccessOrder(req, order))) {
      return res.status(403).send("Nao pode consultar esta encomenda.");
    }

    if (order.paymentStatus !== "paid") {
      order.paymentStatus = "canceled";
      await order.save();
    }

    return res.redirect(`/orders/${order._id}?payment=canceled`);
  } catch (error) {
    console.error("Erro ao cancelar o checkout da Stripe:", error);
    return res.status(500).send("Erro ao voltar do pagamento.");
  }
};

exports.handleWebhook = async (req, res) => {
  const stripe = getStripeClient();

  if (!stripe) {
    return res.status(500).send("Stripe nao esta configurado.");
  }

  const signature = req.headers["stripe-signature"];
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (error) {
    console.error("Erro ao validar webhook da Stripe:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const order = await findOrderForSession(session);

        if (order) {
          await markOrderAsPaid(order, session);
        }

        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object;
        const order = await findOrderForSession(session);

        if (order && order.paymentStatus !== "paid") {
          order.paymentStatus = "failed";
          await order.save();
        }

        break;
      }
      default:
        break;
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Erro ao processar webhook da Stripe:", error);
    return res.status(500).send("Erro ao processar webhook.");
  }
};
