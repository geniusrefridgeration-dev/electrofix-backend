const mongoose = require("mongoose");

const visitChargeSlabSchema = new mongoose.Schema({
  minKm:  { type: Number, required: true },
  maxKm:  { type: Number, required: true },
  charge: { type: Number, required: true },
  label:  { type: String },
});

const homeVisitConfigSchema = new mongoose.Schema(
  {
    slabs:         { type: [visitChargeSlabSchema], default: [] },
    defaultCharge: { type: Number, default: 500 },
    isActive:      { type: Boolean, default: true },
    // Shop location — admin sets this from Settings page
    shopLat: { type: Number, default: null },
    shopLng: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HomeVisitConfig", homeVisitConfigSchema);
