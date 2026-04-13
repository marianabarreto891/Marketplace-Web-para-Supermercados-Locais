const Category = require("../models/Category");

exports.listCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.render("admin/categories", { categories });
  } catch (error) {
    res.status(500).send("Erro ao listar categorias");
  }
};

exports.createCategory = async (req, res) => {
  try {
    await Category.create({ name: req.body.name, description: req.body.description });
    res.redirect("/admin/categories");
  } catch (error) {
    res.status(500).send("Erro ao criar categoria");
  }
};