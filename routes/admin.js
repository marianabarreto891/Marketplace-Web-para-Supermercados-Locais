var express = require("express");
var router = express.Router();
const { requireAuth, requireRole } = require("../middlewares/auth");

const adminController = require("../controllers/adminController");
const categoryController = require("../controllers/categoryController");
const couponController = require("../controllers/couponController");
const Product = require("../models/Product");

router.use(requireAuth, requireRole(["admin"]));

// Rotas de Admin
router.get("/dashboard", adminController.getDashboard);
router.post("/supermarket/:id/approve", adminController.approveSupermarket);
router.post("/supermarket/:id/disapprove", adminController.disapproveSupermarket);
router.get("/users", adminController.listUsers);
router.get("/reviews", adminController.listReviews);

// Rotas de Categorias
router.get("/categories", categoryController.listCategories);
router.post("/categories/new", categoryController.createCategory);
router.get("/categories/:id/edit", categoryController.renderEditCategory);
router.post("/categories/:id/edit", categoryController.updateCategory);
router.post("/categories/:id/delete", categoryController.deleteCategory);

// Rotas de Coupons
router.get("/coupons", couponController.listCoupons);
router.post("/coupons/new", couponController.createCoupon);
router.post("/coupons/:id/toggle", couponController.toggleCoupon);

// Eliminar produto (admin)
router.post("/products/:productId/delete", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.productId);
    const referer = req.headers.referer || "/admin/dashboard";
    res.redirect(referer);
  } catch (error) {
    res.status(500).send("Erro ao apagar produto");
  }
});

// Criar novo Administrador
router.get("/createAdmin", adminController.renderCreateAdminForm);
router.post("/createAdmin", adminController.createAdmin);

module.exports = router;
