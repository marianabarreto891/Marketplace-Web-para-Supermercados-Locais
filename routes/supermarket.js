var express = require("express");
var router = express.Router();
const Product = require("../models/Product");
const Supermarket = require('../models/Supermarket');
const User = require('../models/User');
const { checkAuth, isSupermarket } = require('../middlewares/auth');

// Se alguém for para /supermarket, é reencaminhado automaticamente para a lista
router.get("/", (req, res) => {
  res.redirect("/supermarket/list");
});

//ROTAS GERAIS DE DASHBOARD ---
router.get("/dashboard", function (req, res) {
  res.render("dashboard");
});

//ROTAS DO SUPERMERCADO 

// Listar todos os supermercados
router.get("/list", async (req, res) => {
  try {
    const supermarkets = await Supermarket.find().populate('manager', 'name email');
    // Envia o userRole para a vista!
    res.render("supermarkets/list", { 
      supermarkets, 
      userRole: req.session.role,
      userId: req.session.userId 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao listar supermercados.");
  }
});



// Mostrar formulário para CRIAR supermercado 
router.get("/new", checkAuth,isSupermarket, async (req, res) => {
  // Já não precisamos de passar a lista de users!
  res.render("supermarkets/create");
});

// Processar a CRIAÇÃO do supermercado
router.post("/new", checkAuth, isSupermarket, async (req, res) => {
  try {
    const { name, description, location, hours, deliveryMethods, deliveryCost } = req.body;
    
    const methods = Array.isArray(deliveryMethods) ? deliveryMethods : [deliveryMethods];

    const newSupermarket = new Supermarket({
      name,
      description,
      location,
      hours,
      deliveryMethods: methods,
      deliveryCost,
      // VAMOS BUSCAR O MANAGER DIRETAMENTE À SESSÃO!
      manager: req.session.userId, 
      isApproved: false
    });

    await newSupermarket.save();
    res.redirect(`/supermarket/${newSupermarket._id}`);
  } catch (error) {
    console.error("Erro ao criar supermercado:", error);
    res.status(500).send("Erro ao criar supermercado: " + error.message);
  }
});
// ROTAS DINÂMICAS 

// Ver detalhes de UM supermercado
router.get("/:id", async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.id).populate('manager', 'name email');
    if (!supermarket) return res.status(404).send("Supermercado não encontrado.");
    
    res.render("supermarkets/show", { supermarket });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao carregar o supermercado.");
  }
});

// Mostrar formulário para EDITAR supermercado
router.get("/:id/edit", checkAuth, isSupermarket, async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.id);
    if (!supermarket) return res.status(404).send("Supermercado não encontrado.");
    
    // VERIFICAÇÃO DE SEGURANÇA 
    if (req.session.role !== 'admin' && supermarket.manager.toString() !== req.session.userId) {
      return res.status(403).send("Acesso Negado: Só podes editar o teu próprio supermercado.");
    }
    
    res.render("supermarkets/edit", { supermarket });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao carregar formulário de edição.");
  }
});

// Processar a EDIÇÃO do supermercado
router.post("/:id/edit", checkAuth, isSupermarket, async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.id);
    if (!supermarket) return res.status(404).send("Supermercado não encontrado.");

    // VERIFICAÇÃO DE SEGURANÇA
    if (req.session.role !== 'admin' && supermarket.manager.toString() !== req.session.userId) {
      return res.status(403).send("Acesso Negado: Só podes editar o teu próprio supermercado.");
    }

    const { name, description, location, hours, deliveryMethods, deliveryCost } = req.body;
    const methods = Array.isArray(deliveryMethods) ? deliveryMethods : [deliveryMethods];

    // Agora atualizamos usando os dados enviados
    supermarket.name = name;
    supermarket.description = description;
    supermarket.location = location;
    supermarket.hours = hours;
    supermarket.deliveryMethods = methods;
    supermarket.deliveryCost = deliveryCost;
    
    await supermarket.save();

    res.redirect(`/supermarket/${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao atualizar supermercado.");
  }
});

//ROTAS DE PRODUTOS DO SUPERMERCADO

router.get("/:supermarketId/products/new", async (req, res) => {
  res.render("supermarket", { supermarketId: req.params.supermarketId });
});

router.post("/:supermarketId/products/new", async (req, res) => {
  try {
    const newProduct = new Product({
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      price: req.body.price,
      image: req.body.image,
      stock: req.body.stock,
      supermarket: req.params.supermarketId,
    });

    await newProduct.save();

    res.redirect(`/supermarket/${req.params.supermarketId}/products`);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).send("Error adding product! " + error.message);
  }
});

router.get("/:supermarketId/products", async function (req, res) {
  try {
    const currentSupermarketId = req.params.supermarketId;

    const supermarketProducts = await Product.find({
      supermarket: currentSupermarketId,
    });

    res.render("listProductsNew", {
      products: supermarketProducts,
      supermarketId: currentSupermarketId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching products!");
  }
});

module.exports = router;