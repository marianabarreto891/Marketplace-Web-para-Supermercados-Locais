var express = require("express");
var router = express.Router();
const Product = require("../models/Product");
const Supermarket = require("../models/Supermarket");
const User = require("../models/User");

const { requireAuth, requireRole } = require("../middlewares/auth");

router.get("/", (req, res) => {
  res.redirect("/supermarket/list");
});

router.get(
  "/dashboard",
  requireAuth,
  requireRole(["admin", "supermercado", "estafeta"]),
  function (req, res) {
    res.render("dashboard");
  },
);

router.get("/list", requireAuth, async (req, res) => {
  try {
    let query = {};

    if (req.session.role === "cliente") {
      query = { isApproved: true };
    } else if (req.session.role === "supermercado") {
      query = { manager: req.session.userId };
    }

    const supermarkets = await Supermarket.find(query).populate(
      "manager",
      "name email",
    );

    res.render("supermarkets/list", {
      supermarkets,
      userRole: req.session.role,
      userId: req.session.userId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao listar supermercados!");
  }
});

router.get(
  "/new",
  requireAuth,
  requireRole(["supermercado", "admin"]),
  async (req, res) => {
    res.render("supermarkets/create");
  },
);

router.post(
  "/new",
  requireAuth,
  requireRole(["supermercado", "admin"]),
  async (req, res) => {
    try {
      const {
        name,
        description,
        location,
        hours,
        deliveryMethods,
        deliveryCost,
      } = req.body;

      const methods = Array.isArray(deliveryMethods)
        ? deliveryMethods
        : [deliveryMethods];

      const newSupermarket = new Supermarket({
        name,
        description,
        location,
        hours,
        deliveryMethods: methods,
        deliveryCost,
        manager: req.session.userId,
        isApproved: false,
      });

      await newSupermarket.save();
      res.redirect(`/supermarket/${newSupermarket._id}`);
    } catch (error) {
      console.error("Erro ao criar supermercado:", error);
      res.status(500).send("Erro ao criar supermercado: " + error.message);
    }
  },
);

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const supermarket = await Supermarket.findById(req.params.id).populate(
      "manager",
      "name email",
    );
    if (!supermarket)
      return res.status(404).send("Supermercado não encontrado!");

    res.render("supermarkets/show", { supermarket });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao carregar o supermercado!");
  }
});

router.get(
  "/:id/edit",
  requireAuth,
  requireRole(["supermercado", "admin"]),
  async (req, res) => {
    try {
      const supermarket = await Supermarket.findById(req.params.id);
      if (!supermarket)
        return res.status(404).send("Supermercado não encontrado!");

      if (
        req.session.role !== "admin" &&
        supermarket.manager.toString() !== req.session.userId
      ) {
        return res
          .status(403)
          .send("Acesso Negado: Só pode editar o seu próprio supermercado!");
      }

      res.render("supermarkets/edit", { supermarket });
    } catch (error) {
      console.error(error);
      res.status(500).send("Erro ao carregar formulário de edição!");
    }
  },
);

router.post(
  "/:id/edit",
  requireAuth,
  requireRole(["supermercado", "admin"]),
  async (req, res) => {
    try {
      const supermarket = await Supermarket.findById(req.params.id);
      if (!supermarket)
        return res.status(404).send("Supermercado não encontrado!");

      if (
        req.session.role !== "admin" &&
        supermarket.manager.toString() !== req.session.userId
      ) {
        return res
          .status(403)
          .send("Acesso Negado: Só pode editar o seu próprio supermercado!");
      }

      const {
        name,
        description,
        location,
        hours,
        deliveryMethods,
        deliveryCost,
      } = req.body;
      const methods = Array.isArray(deliveryMethods)
        ? deliveryMethods
        : [deliveryMethods];

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
      res.status(500).send("Erro ao atualizar supermercado!");
    }
  },
);

router.get(
  "/:supermarketId/products/new",
  requireAuth,
  requireRole(["supermercado", "admin"]),
  async (req, res) => {
    res.render("supermarket", { supermarketId: req.params.supermarketId });
  },
);

router.post(
  "/:supermarketId/products/new",
  requireAuth,
  requireRole(["supermercado", "admin"]),
  async (req, res) => {
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
      res.status(500).send("Erro ao adicionar produto! " + error.message);
    }
  },
);

router.get("/:supermarketId/products", requireAuth, async function (req, res) {
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
    res.status(500).send("Erro ao listar produtos do supermercado!");
  }
});

module.exports = router;
