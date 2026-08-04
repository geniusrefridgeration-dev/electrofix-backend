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

    // Billing / Invoice
    invoiceNumber: { type: String, default: null, unique: true, sparse: true },
    billItems: [{
      label:    { type: String, required: true },   // e.g. "Repair Charge", "Home Visit", "Spare Part"
      amount:   { type: Number, required: true },
      quantity: { type: Number, default: 1 },
    }],
    discount:        { type: Number, default: 0 },
    gstPercent:      { type: Number, default: 0 },
    gstAmount:       { type: Number, default: 0 },
    grandTotal:      { type: Number, default: null },
    paymentStatus:   { type: String, enum: ["unpaid", "paid", "partial"], default: "unpaid" },
    paymentMethod:   { type: String, enum: ["cash", "upi", "card", "online", null], default: null },
    paidAt:          { type: Date, default: null },
    billGeneratedAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "dispatched", "completed", "cancelled"],
      default: "pending",
    },

    rejectionReason: { type: String, default: null },
    rejectionType:   { type: String, enum: ["predefined", "custom", null], default: null },
    adminNotes:      { type: String, default: null },
    scheduledDate:   { type: Date,   default: null },   // set by admin on accept

    // Employee assignment — set when admin dispatches the booking
    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    employeeSnapshot: {
      name: String, mobile: String, designation: String,
      profileImage: String, employeeIdCode: String,
    },
    assignedAt: { type: Date, default: null },

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
    // Use timestamp + random to avoid duplicate key on concurrent bookings
    const ts   = Date.now().toString().slice(-6);
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    this.bookingId = `EF${ts}${rand}`;   // e.g. EF734215006
  }
  next();
});

bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ customer: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
