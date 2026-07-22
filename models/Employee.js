const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    email:  { type: String, default: null, trim: true, lowercase: true },

    // Role/skill info
    designation:    { type: String, default: "Technician" },   // e.g. "Senior Technician", "Electrician"
    specialization: [{ type: String }],                         // e.g. ["AC", "Refrigerator", "Washing Machine"]

    profileImage: { type: String, default: null },             // Cloudinary URL

    address: {
      street: String, city: String, state: String, pincode: String, fullAddress: String,
    },

    aadharNumber:   { type: String, default: null },
    employeeIdCode: { type: String, default: null },           // shown to customer, e.g. "EF-TECH-001"

    isActive: { type: Boolean, default: true },

    // Performance tracking (auto-updated)
    totalAssigned:  { type: Number, default: 0 },
    totalCompleted: { type: Number, default: 0 },
    avgRating:      { type: Number, default: 0 },

    joinedAt: { type: Date, default: Date.now },
    notes:    { type: String, default: null },                  // internal admin notes
  },
  { timestamps: true }
);

employeeSchema.index({ isActive: 1 });
employeeSchema.index({ mobile: 1 });

module.exports = mongoose.model("Employee", employeeSchema);
