const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  supermarket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supermarket",
    required: true,
  },
});

module.exports = mongoose.model("Product", productSchema);
