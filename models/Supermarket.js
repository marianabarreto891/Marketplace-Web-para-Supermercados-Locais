const mongoose = require('mongoose');   

const supermarketSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  location: { type: String, required: true },
  hours: { type: String },
  deliveryMethods: [{ 
    type: String, 
    enum: ['Pickup in Store', 'Delivery by Estafeta'] 
  }], 
  deliveryCost: { type: Number, default: 0 },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Supermarket', supermarketSchema);