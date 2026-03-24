const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // encriptar isto
  morada: { type: String, required: true },
  telefone: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['cliente', 'supermercado', 'estafeta', 'admin'], 
    default: 'cliente' 
  },
  // Para supermercados: o admin precisa de aprovar a conta antes de poder usar a plataforma
  isApproved: { type: Boolean, default: false }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);