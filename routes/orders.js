var express = require("express");
var router = express.Router();

const { requireAuth, requireRole } = require("../middlewares/auth");
const orderController = require("../controllers/orderController");

router.use(requireAuth);

// Criar Venda (Apenas Admin e Supermercado)
router.get(
  "/create/:supermarketId",
  requireRole(["admin", "supermercado"]),
  orderController.renderCreateForm,
);
router.post(
  "/create/:supermarketId",
  requireRole(["admin", "supermercado"]),
  orderController.createOrder,
);

// Histórico e Listagem 
router.get(
  "/",
  requireRole(["admin", "supermercado", "estafeta"]),
  orderController.listOrders,
);

// Detalhes de uma Encomenda específica
router.get(
  "/:id",
  requireRole(["admin", "supermercado", "estafeta"]),
  orderController.showOrder,
);

// Aceitar Encomenda (Apenas Estafeta)
router.post(
  "/:id/claim",
  requireRole(["estafeta"]),
  orderController.claimOrder,
);

// Atualizar Estado da Encomenda
router.post(
  "/:id/status",
  requireRole(["admin", "supermercado", "estafeta"]),
  orderController.updateOrderStatus,
);

module.exports = router;
