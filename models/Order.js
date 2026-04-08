const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    nome: {
      type: String,
      required: true
    },
    precoUnitario: {
      type: Number,
      required: true,
      min: 0
    },
    quantidade: {
      type: Number,
      required: true,
      min: 1
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    supermercado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supermarket",
      required: true
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "A encomenda deve ter pelo menos um item."
      }
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    metodoEntrega: {
      type: String,
      enum: ["levantamento_loja", "estafeta"],
      required: true
    },
    custoEntrega: {
      type: Number,
      default: 0,
      min: 0
    },
    estafeta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    estado: {
      type: String,
      enum: [
        "pendente",
        "confirmada",
        "em_preparacao",
        "em_entrega",
        "entregue",
        "cancelada"
      ],
      default: "confirmada"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
