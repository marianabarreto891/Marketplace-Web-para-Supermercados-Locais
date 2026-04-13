const Product = require("../models/Product");
const Supermarket = require("../models/Supermarket");
const Category = require("../models/Category");

exports.listProducts = async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.supermarketId);
    let query = { supermarket: req.params.supermarketId };
    if (req.query.search) query.name = { $regex: req.query.search, $options: "i" };

    const products = await Product.find(query).populate("category");
    res.render("products/list", { products, supermarket, searchQuery: req.query.search, userRole: req.session.role });
  } catch (error) {
    res.status(500).send("Erro ao listar produtos!");
  }
};

exports.renderCreateForm = async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.supermarketId);
    if (!supermarket.isApproved) return res.status(403).send("O seu supermercado ainda não está aprovado.");
    const categories = await Category.find();
    res.render("products/create", { supermarket, categories });
  } catch (error) {
    res.status(500).send("Erro ao carregar formulário.");
  }
};

exports.createProduct = async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.supermarketId);
    if (!supermarket.isApproved) return res.status(403).send("Não aprovado.");
    await Product.create({ ...req.body, supermarket: req.params.supermarketId });
    res.redirect(`/supermarket/${req.params.supermarketId}/products`);
  } catch (error) {
    res.status(500).send("Erro ao adicionar produto!");
  }
};

exports.renderEditForm = async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.supermarketId);
    if (!supermarket.isApproved) return res.status(403).send("Não aprovado.");
    const product = await Product.findById(req.params.productId);
    const categories = await Category.find();
    res.render("products/edit", { product, supermarket, categories });
  } catch (error) {
    res.status(500).send("Erro ao carregar produto.");
  }
};

exports.updateProduct = async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.productId, req.body);
    res.redirect(`/supermarket/${req.params.supermarketId}/products`);
  } catch (error) {
    res.status(500).send("Erro ao atualizar produto.");
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.productId);
    res.redirect(`/supermarket/${req.params.supermarketId}/products`);
  } catch (error) {
    res.status(500).send("Erro ao apagar produto.");
  }
};