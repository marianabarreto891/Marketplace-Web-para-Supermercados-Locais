var express = require("express");
var router = express.Router();
const { requireAuth, requireRole } = require("../middlewares/auth");

const adminController = require("../controllers/adminController");
const categoryController = require("../controllers/categoryController");
const couponController = require("../controllers/couponController");

router.use(requireAuth, requireRole(["admin"]));

// Rotas de Admin
router.get("/dashboard", adminController.getDashboard);
router.post("/supermarket/:id/approve", adminController.approveSupermarket);
router.post("/supermarket/:id/disapprove", adminController.disapproveSupermarket);
router.get("/users", adminController.listUsers);

// Rotas de Categorias
router.get("/categories", categoryController.listCategories);
router.post("/categories/new", categoryController.createCategory);
router.get("/coupons", couponController.listCoupons);
router.post("/coupons/new", couponController.createCoupon);
router.post("/coupons/:id/toggle", couponController.toggleCoupon);

// Criar novo Administrador
router.get("/createAdmin", adminController.renderCreateAdminForm);
router.post("/createAdmin", adminController.createAdmin);

module.exports = router;
