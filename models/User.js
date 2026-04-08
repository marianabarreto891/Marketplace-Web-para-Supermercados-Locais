const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String },
  telephone: { type: String },
  role: {
    type: String,
    enum: ["cliente", "supermercado", "estafeta", "admin"],
    default: "cliente",
  },
  // Para supermercados: o admin precisa de aprovar a conta antes de poder usar a plataforma
  isApproved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre("validate", function () {
  if (!this.phone && this.telephone) {
    this.phone = this.telephone;
  }

  if (!this.telephone && this.phone) {
    this.telephone = this.phone;
  }
});

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

module.exports = mongoose.model("User", userSchema);
