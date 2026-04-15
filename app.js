require("dotenv").config();
require("./models/db");
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const session = require("express-session");

var app = express();

// Configuração do motor de vistas
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// --- CONFIGURAÇÃO DE FICHEIROS ESTÁTICOS ---
// Esta linha permite que o navegador aceda a tudo dentro de 'public'
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
var adminRouter = require("./routes/admin");
var ordersRouter = require("./routes/orders");

// Definição de Rotas
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/supermarket", supermarketRouter);
app.use("/admin", adminRouter);
app.use("/orders", ordersRouter);

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