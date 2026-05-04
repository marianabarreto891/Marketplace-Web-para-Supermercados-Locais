const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supermarket = require("../models/Supermarket");

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// Middleware JWT para as rotas API
function requireJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ error: "Não autenticado" });
  try {
    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Regista um novo cliente
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *     responses:
 *       201:
 *         description: Registo efetuado com sucesso
 *       400:
 *         description: Email já registado
 */
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, address, phone } = req.body;
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: "Email já registado" });
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      address,
      phone,
      role: "cliente",
      isApproved: true,
    });
    await user.save();
    res.status(201).json({ message: "Registo efetuado com sucesso" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Faz login na conta de cliente
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login com sucesso, devolve o token JWT
 *       400:
 *         description: Utilizador não encontrado ou password incorreta
 */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(400).json({ error: "Utilizador não encontrado" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Password incorreta" });
    if (user.role !== "cliente")
      return res
        .status(403)
        .json({ error: "Esta área é apenas para clientes" });
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Devolve os dados do cliente autenticado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do utilizador
 *       401:
 *         description: Não autenticado ou token inválido
 */
router.get("/auth/me", requireJWT, async (req, res) => {
  const user = await User.findById(req.user.userId).select("-password");
  res.json(user);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Lista todos os produtos (com filtros opcionais)
 *     tags: [Produtos]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Pesquisa por nome
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: ID da categoria ou 'all'
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [asc, desc] }
 *         description: Ordenação por preço
 *     responses:
 *       200:
 *         description: Lista de produtos
 */
router.get("/products", async (req, res) => {
  try {
    const query = {};
    if (req.query.search)
      query.name = { $regex: req.query.search, $options: "i" };
    if (req.query.category && req.query.category !== "all")
      query.category = req.query.category;
    const sortOrder = req.query.sort === "desc" ? -1 : 1;
    const products = await Product.find(query)
      .populate("category", "name")
      .populate("supermarket", "name location isApproved")
      .sort({ price: sortOrder });
    const filtered = products.filter((p) => p.supermarket?.isApproved);
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ error: e.message });
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
 */
router.get("/categories", async (req, res) => {
  const cats = await Category.find().sort({ name: 1 });
  res.json(cats);
});

/**
 * @swagger
 * /api/products/compare:
 *   get:
 *     summary: Compara o preço de um produto em vários supermercados
 *     tags: [Produtos]
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema: { type: string }
 *         description: Nome do produto a comparar
 *     responses:
 *       200:
 *         description: Lista do mesmo produto em diferentes supermercados
 */
router.get("/products/compare", async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Nome obrigatório" });
    const products = await Product.find({
      name: { $regex: name, $options: "i" },
      stock: { $gt: 0 },
    })
      .populate("supermarket", "name location isApproved")
      .populate("category", "name")
      .sort({ price: 1 });
    const filtered = products.filter((p) => p.supermarket?.isApproved);
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /api/supermarkets:
 *   get:
 *     summary: Lista todos os supermercados aprovados
 *     tags: [Supermercados]
 *     responses:
 *       200:
 *         description: Lista de supermercados
 */
router.get("/supermarkets", async (req, res) => {
  try {
    const supers = await Supermarket.find({ isApproved: true }).sort({
      name: 1,
    });
    res.json(supers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.requireJWT = requireJWT;
