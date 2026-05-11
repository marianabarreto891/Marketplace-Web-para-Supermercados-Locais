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

exports.renderEditCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).send("Categoria não encontrada");
    res.render("admin/editCategory", { category });
  } catch (error) {
    res.status(500).send("Erro ao carregar categoria");
  }
};

exports.updateCategory = async (req, res) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, {
      name: req.body.name,
      description: req.body.description,
    });
    res.redirect("/admin/categories");
  } catch (error) {
    res.status(500).send("Erro ao atualizar categoria");
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.redirect("/admin/categories");
  } catch (error) {
    res.status(500).send("Erro ao eliminar categoria");
  }
};