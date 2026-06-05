const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },

    customerSnapshot: {
      name: String, mobile: String, email: String,
      address: { street: String, city: String, state: String, pincode: String, fullAddress: String },
      location: { type: { type: String, default: "Point" }, coordinates: [Number] },
    },

    service: {
      serviceId:   { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
      serviceName: String,
      categoryId:  { type: mongoose.Schema.Types.ObjectId, default: null },
      categoryName:{ type: String, default: null },
      problemId:   mongoose.Schema.Types.ObjectId,
      problemName: String,
      problemPrice:{ type: Number, default: null },
      isPriceFixed:{ type: Boolean, default: false },
    },

    homeVisitCharge: { type: Number, default: 0 },
    distanceKm:      { type: Number, default: 0 },
    totalAmount:     { type: Number, default: null },   // set by admin on complete

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "dispatched", "completed", "cancelled"],
      default: "pending",
    },

    rejectionReason: { type: String, default: null },
    rejectionType:   { type: String, enum: ["predefined", "custom", null], default: null },
    adminNotes:      { type: String, default: null },
    scheduledDate:   { type: Date,   default: null },   // set by admin on accept

    // Cancellation
    cancelledBy:     { type: String, enum: ["customer", "admin", null], default: null },
    cancelReason:    { type: String, default: null },
    cancelledAt:     { type: Date,   default: null },

    // Rating
    rating:          { type: Number, min: 1, max: 5, default: null },
    review:          { type: String, default: null },
    ratedAt:         { type: Date,   default: null },

    // Status timestamps
    acceptedAt:   { type: Date, default: null },
    rejectedAt:   { type: Date, default: null },
    dispatchedAt: { type: Date, default: null },
    completedAt:  { type: Date, default: null },

    notificationSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bookingSchema.pre("save", async function (next) {
  if (!this.bookingId) {
    const count = await mongoose.model("Booking").countDocuments();
    this.bookingId = `EF${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ customer: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
