var express = require("express");
var router = express.Router();
const Product = require("../models/Product");

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
