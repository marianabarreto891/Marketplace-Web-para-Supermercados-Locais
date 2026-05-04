const cors = require("cors");
require("dotenv").config();
require("./models/db");
var createError = require("http-errors");
var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const session = require("express-session");
const paymentController = require("./controllers/paymentController");
const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");

var app = express();

app.use(cors({ origin: "http://localhost:4200", credentials: true }));

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Marketplace API",
      version: "1.0.0",
      description:
        "API para o FrontOffice em Angular do Marketplace de Supermercados",
    },
    servers: [{ url: "http://localhost:3000" }],
  },
  apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.post(
  "/payments/webhook",
  bodyParser.raw({ type: "application/json" }),
  paymentController.handleWebhook,
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "segredo",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  }),
);

// Importação de Rotas
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var supermarketRouter = require("./routes/supermarket");
var courierRouter = require("./routes/courier");
var adminRouter = require("./routes/admin");
var ordersRouter = require("./routes/orders");
var paymentsRouter = require("./routes/payments");
var apiRouter = require("./routes/api");

// Definição de Rotas
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/supermarket", supermarketRouter);
app.use("/courier", courierRouter);
app.use("/estafeta", courierRouter);
app.use("/admin", adminRouter);
app.use("/orders", ordersRouter);
app.use("/payments", paymentsRouter);
app.use("/api", apiRouter);

// Erro 404
app.use(function (req, res, next) {
  next(createError(404));
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
  });
}
