const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  supermarket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supermarket",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
