require("dotenv").config();
require("./models/db");
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const session = require("express-session");

var app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
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

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var supermarketRouter = require("./routes/supermarket");
var adminRouter = require("./routes/admin");


app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/supermarket", supermarketRouter);
app.use("/admin", adminRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

module.exports = app;

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});
