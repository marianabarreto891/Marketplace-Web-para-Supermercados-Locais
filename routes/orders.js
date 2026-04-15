// routes/orders.js COMPLETO E CORRIGIDO
var express = require("express");
var router = express.Router();
const orderController = require("../controllers/orderController");
const { requireAuth, requireRole } = require("../middlewares/auth");

// --- ROTAS GERAIS ---

// Listar encomendas (com filtros)
router.get("/", requireAuth, orderController.listOrders);

// Ver detalhes de uma encomenda específica
router.get("/:id", requireAuth, orderController.showOrder);

// --- ROTAS DE CRIAÇÃO (Apenas Supermercado/Admin) ---

// Renderizar o formulário de criação de venda POS
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

// --- ROTAS DE OPERAÇÕES ---

// Estafeta aceitar/reivindicar uma entrega
router.post(
  "/:id/claim",
  requireAuth,
  requireRole(["estafeta"]),
  orderController.claimOrder
);

// Atualizar o estado da encomenda (transições permitidas)
router.post("/:id/status", requireAuth, orderController.updateOrderStatus);

// --- NOVA ROTA DE AVALIAÇÃO (Ponto 3) ---
// Cliente submeter a avaliação (requireAuth garante que é o cliente logado)
router.post("/:id/rate", requireAuth, orderController.rateOrder);

module.exports = router;