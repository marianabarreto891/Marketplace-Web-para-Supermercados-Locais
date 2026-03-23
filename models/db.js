require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection;
db.on("error", (error) => {
  console.error("erro", error);
});

db.on("open", () => {
  console.log("sucesso");
});

module.exports = db;