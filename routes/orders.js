var express = require("express");
var router = express.Router();
const orderController = require("../controllers/orderController");
const { requireAuth, requireRole } = require("../middlewares/auth");


// Listar encomendas 
router.get("/", requireAuth, orderController.listOrders);

// Ver detalhes de uma encomenda específica
router.get("/:id", requireAuth, orderController.showOrder);


// --- ROTAS DE CRIAÇÃO (Apenas Supermercado/Admin) ---

router.get(
  "/create/:supermarketId",
  requireAuth,
  requireRole(["supermercado", "admin"]),
  orderController.renderCreateForm
);

// Processar a criação da venda
router.post(
  "/create/:supermarketId",
  requireAuth,
  requireRole(["supermercado", "admin"]),
  orderController.createOrder
);



// Estafeta aceita uma entrega
router.post(
  "/:id/claim",
  requireAuth,
  requireRole(["estafeta"]),
  orderController.claimOrder
);

// Atualizar o estado da encomenda 
router.post("/:id/status", requireAuth, orderController.updateOrderStatus);

//Rota de avaliação de encomenda
router.post("/:id/rate", requireAuth, orderController.rateOrder);

module.exports = router;