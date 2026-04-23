const Mailgen = require("mailgen");

const { getFromAddress, getTransporter, isMailerConfigured } = require("./mailer");

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

function formatCurrency(value) {
  return `EUR ${Number(value || 0).toFixed(2)}`;
}

function getOrderShortCode(orderId) {
  return String(orderId || "").slice(-6).toUpperCase();
}

function getAppBaseUrl() {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

function buildIntro(previousStatus, nextStatus) {
  if (!previousStatus) {
    return `A sua encomenda foi registada com sucesso e encontra-se em ${ORDER_STATUS_LABELS[nextStatus] || nextStatus}.`;
  }

  return `A sua encomenda mudou de ${ORDER_STATUS_LABELS[previousStatus] || previousStatus} para ${ORDER_STATUS_LABELS[nextStatus] || nextStatus}.`;
}

function buildActionDescription(nextStatus) {
  if (nextStatus === "em_preparacao") {
    return "O supermercado esta a preparar a sua encomenda.";
  }

  if (nextStatus === "em_entrega") {
    return "A sua encomenda esta a caminho.";
  }

  if (nextStatus === "entregue") {
    return "A encomenda foi marcada como entregue.";
  }

  if (nextStatus === "cancelada") {
    return "A encomenda foi cancelada.";
  }

  return "Pode consultar os detalhes atualizados da encomenda no marketplace.";
}

function buildEmailBody(order, previousStatus, nextStatus) {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Marketplace",
      link: getAppBaseUrl(),
    },
  });

  const orderUrl = `${getAppBaseUrl()}/orders/${order._id}`;
  const rows = [
    { item: "Encomenda", descricao: getOrderShortCode(order._id) },
    {
      item: "Supermercado",
      descricao: order.supermercado ? order.supermercado.name : "-",
    },
    {
      item: "Estado",
      descricao: ORDER_STATUS_LABELS[nextStatus] || nextStatus,
    },
    {
      item: "Metodo de entrega",
      descricao: DELIVERY_METHOD_LABELS[order.metodoEntrega] || order.metodoEntrega,
    },
    { item: "Total", descricao: formatCurrency(order.total) },
  ];

  if (order.couponCode) {
    rows.push({
      item: "Cupao aplicado",
      descricao: `${order.couponCode} (-${formatCurrency(order.discountApplied)})`,
    });
  }

  if (order.estafetaDisplayName && order.estafetaDisplayName !== "-") {
    rows.push({
      item: "Estafeta",
      descricao: order.estafetaDisplayName,
    });
  }

  const email = {
    body: {
      name: order.cliente && order.cliente.name ? order.cliente.name : "Cliente",
      intro: buildIntro(previousStatus, nextStatus),
      table: {
        data: rows,
        columns: {
          customWidth: {
            item: "25%",
            descricao: "75%",
          },
        },
      },
      outro: buildActionDescription(nextStatus),
      action: {
        instructions: "Pode consultar a encomenda aqui:",
        button: {
          color: "#0d6efd",
          text: "Ver encomenda",
          link: orderUrl,
        },
      },
      signature: false,
    },
  };

  return {
    html: mailGenerator.generate(email),
    text: mailGenerator.generatePlaintext(email),
  };
}

async function sendOrderStatusEmail(order, previousStatus, nextStatus) {
  if (!order || !order.cliente || !order.cliente.email) {
    return false;
  }

  if (!isMailerConfigured()) {
    console.warn(
      "Email não enviado: faltam variaveis MAIL_* no .env para o transporte SMTP.",
    );
    return false;
  }

  const transporter = getTransporter();

  if (!transporter) {
    return false;
  }

  const { html, text } = buildEmailBody(order, previousStatus, nextStatus);
  const statusLabel = ORDER_STATUS_LABELS[nextStatus] || nextStatus;

  await transporter.sendMail({
    from: getFromAddress(),
    to: order.cliente.email,
    subject: `Atualizacao da encomenda ${getOrderShortCode(order._id)} - ${statusLabel}`,
    html,
    text,
  });

  return true;
}

module.exports = {
  sendOrderStatusEmail,
};
