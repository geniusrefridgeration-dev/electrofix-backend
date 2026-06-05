const mongoose = require("mongoose");

// Problem schema (e.g., "Clothes not drying", "Machine not spinning")
const problemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Problem name is required"],
    trim: true,
  },
  nameHindi: { type: String, trim: true },     // Hindi translation
  nameHinglish: { type: String, trim: true },  // Hinglish translation
  price: {
    type: Number,
    default: null, // null means price not fixed (will be decided after inspection)
  },
  isPriceFixed: {
    type: Boolean,
    default: false,
  },
  isActive: { type: Boolean, default: true },
});

// Category schema (e.g., "Semi Automatic", "Fully Automatic")
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Category name is required"],
    trim: true,
  },
  nameHindi: { type: String, trim: true },
  nameHinglish: { type: String, trim: true },
  image: { type: String, default: null },
  problems: [problemSchema],
  isActive: { type: Boolean, default: true },
});

// Service schema (e.g., "Washing Machine", "RO", "AC")
const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      unique: true,
    },
    nameHindi: { type: String, trim: true },
    nameHinglish: { type: String, trim: true },
    description: { type: String, trim: true },
    descriptionHindi: { type: String, trim: true },
    descriptionHinglish: { type: String, trim: true },
    image: { type: String, default: null },

    // hasCategories = false means problems are directly under service (like RO)
    hasCategories: {
      type: Boolean,
      default: true,
    },

    categories: [categorySchema], // only used if hasCategories = true

    // Direct problems (only used if hasCategories = false)
    problems: [problemSchema],

    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
