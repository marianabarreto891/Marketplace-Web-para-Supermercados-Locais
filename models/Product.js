const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: { type: String },
  categoria: { type: String, required: true }, // ex: Frutas, Bebidas 
  preco: { type: Number, required: true },
  imagem: { type: String }, // URL ou caminho da imagem [cite: 80]
  stock: { type: Number, default: 0 },
  // Importante: Cada produto pertence a um supermercado específico 
  supermercado: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Product', productSchema);