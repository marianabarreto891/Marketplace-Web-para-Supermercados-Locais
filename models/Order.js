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
        message: "A encomenda deve ter pelo menos um produto."
      }
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    subtotalProdutos: {
      type: Number,
      default: 0,
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
    nomeEstafeta: {
      type: String,
      default: ""
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null
    },
    couponCode: {
      type: String,
      default: ""
    },
    couponType: {
      type: String,
      enum: ["percent", "fixed", "free_shipping", ""],
      default: ""
    },
    couponValue: {
      type: Number,
      default: 0,
      min: 0
    },
    discountApplied: {
      type: Number,
      default: 0,
      min: 0
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
    },
    
    avaliacaoSupermercado: {
      rating: { type: Number, min: 1, max: 5 },
      comentario: { type: String }
    },
    avaliacaoEstafeta: {
      rating: { type: Number, min: 1, max: 5 },
      comentario: { type: String }
    }
}, { timestamps: true });
 
module.exports = mongoose.model("Order", orderSchema);
