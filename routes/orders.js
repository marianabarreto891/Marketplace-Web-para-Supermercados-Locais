var express = require("express");
var router = express.Router();

const Order = require("../models/Order");
const Product = require("../models/Product");
const Supermarket = require("../models/Supermarket");
const User = require("../models/User");

// formulário de nova venda
router.get("/create/:supermarketId", async function (req, res) {
  try {
    const supermarket = await Supermarket.findById(req.params.supermarketId);
    const products = await Product.find({ supermarket: req.params.supermarketId });

    if (!supermarket) {
      return res.status(404).send("Supermercado não encontrado.");
    }

    res.render("orders/create", {
      supermarket,
      products
    });
  } catch (error) {
    console.error("Erro ao abrir formulário de venda:", error);
    res.status(500).send("Erro ao abrir formulário de venda.");
  }
});

// criar venda
router.post("/create/:supermarketId", async function (req, res) {
  try {
    const { nome, email, morada, telefone, metodoEntrega, productIds, quantities } = req.body;

    const supermarket = await Supermarket.findById(req.params.supermarketId);
    if (!supermarket) {
      return res.status(404).send("Supermercado não encontrado.");
    }

    // procurar cliente por email
    let cliente = await User.findOne({ email });

    // se não existir, criar cliente
    if (!cliente) {
      cliente = await User.create({
        nome,
        email,
        password: "temporaria123",
        morada,
        telefone,
        role: "cliente",
        isApproved: true
      });
    }

    const ids = Array.isArray(productIds) ? productIds : [productIds];
    const qtys = Array.isArray(quantities) ? quantities : [quantities];

    let items = [];
    let totalProdutos = 0;

    for (let i = 0; i < ids.length; i++) {
      const productId = ids[i];
      const quantidade = Number(qtys[i]);

      if (!productId || !quantidade || quantidade <= 0) {
        continue;
      }

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).send("Produto não encontrado.");
      }

      if (product.supermarket.toString() !== supermarket._id.toString()) {
        return res.status(400).send("Todos os produtos devem pertencer ao mesmo supermercado.");
      }

      if (product.stock < quantidade) {
        return res.status(400).send(`Stock insuficiente para o produto ${product.name}.`);
      }

      const subtotal = product.price * quantidade;

      items.push({
        product: product._id,
        nome: product.name,
        precoUnitario: product.price,
        quantidade,
        subtotal
      });

      totalProdutos += subtotal;
    }

    if (items.length === 0) {
      return res.status(400).send("Tens de selecionar pelo menos um produto.");
    }

    let custoEntrega = 0;
    if (metodoEntrega === "estafeta") {
      custoEntrega = supermarket.deliveryCost || 0;
    }

    const total = totalProdutos + custoEntrega;

    const order = await Order.create({
      cliente: cliente._id,
      supermercado: supermarket._id,
      items,
      total,
      metodoEntrega,
      custoEntrega,
      estado: "confirmada"
    });

    // atualizar stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantidade }
      });
    }

    res.redirect(`/orders/${order._id}`);
  } catch (error) {
    console.error("Erro completo ao registar venda:", error);
    res.status(500).send("Erro ao registar venda.");
  }
});

// detalhe da encomenda
router.get("/:id", async function (req, res) {
  try {
    const order = await Order.findById(req.params.id)
      .populate("cliente")
      .populate("supermercado")
      .populate("items.product");

    if (!order) {
      return res.status(404).send("Encomenda não encontrada.");
    }

    res.render("orders/show", { order });
  } catch (error) {
    console.error("Erro ao carregar encomenda:", error);
    res.status(500).send("Erro ao carregar encomenda.");
  }
});

module.exports = router;