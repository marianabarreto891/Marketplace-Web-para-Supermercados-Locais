const mongoose = require("mongoose");

const supermarketSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    location: { type: String, required: true },
    lat: { type: Number },
    lon: { type: Number },
    hours: { type: String },
    deliveryMethods: [
      {
        type: String,
        enum: ["levantamento_loja", "estafeta"],
        required: true,
      },
    ],
    deliveryCost: { type: Number, default: 0, min: 0 },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isApproved: { type: Boolean, default: false },
    toApprove: { type: Boolean, default: false },
    rejectionReason: { type: String, default: "" },
    acceptsRefunds: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Supermarket", supermarketSchema);
