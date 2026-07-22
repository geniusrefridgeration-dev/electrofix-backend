const Booking = require("../models/Booking");
const Customer = require("../models/Customer");
const Admin = require("../models/Admin");
const Service = require("../models/Service");
const Employee = require("../models/Employee");
const { sendAdminNotification, sendCustomerNotification } = require("../utils/notification");
const { calculateDistance, getHomeVisitCharge, getShopCoords } = require("../utils/distance");
const { sendBookingConfirmationEmail } = require("../utils/email");


/**
 * @route   POST /api/customer/bookings
 * @desc    Customer creates a new booking
 * @access  Private (Customer)
 */
exports.createBooking = async (req, res) => {
  const { serviceId, categoryId, problemId } = req.body;
  const customer = req.customer;

  // Validate service
  const service = await Service.findById(serviceId);
  if (!service || !service.isActive) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }

  // Find problem details
  let problemName, problemPrice, isPriceFixed;
  let categoryName = null;

  if (categoryId) {
    const category = service.categories.id(categoryId);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    const problem = category.problems.id(problemId);
    if (!problem) return res.status(404).json({ success: false, message: "Problem not found" });
    categoryName = category.name;
    problemName = problem.name;
    problemPrice = problem.price;
    isPriceFixed = problem.isPriceFixed;
  } else {
    const problem = service.problems.id(problemId);
    if (!problem) return res.status(404).json({ success: false, message: "Problem not found" });
    problemName = problem.name;
    problemPrice = problem.price;
    isPriceFixed = problem.isPriceFixed;
  }

  // Calculate distance & home visit charge using shop location from DB
  const [custLng, custLat] = customer.location?.coordinates || [0, 0];
  let distanceKm = 0;
  let homeVisitCharge = 0;

  if (custLat && custLng) {
    const shop = await getShopCoords();
    distanceKm = calculateDistance(custLat, custLng, shop.lat, shop.lng);
    homeVisitCharge = await getHomeVisitCharge(distanceKm);
  }

  const booking = await Booking.create({
    customer: customer._id,
    customerSnapshot: {
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      address: customer.address,
      location: customer.location,
    },
    service: {
      serviceId: service._id,
      serviceName: service.name,
      categoryId: categoryId || null,
      categoryName,
      problemId,
      problemName,
      problemPrice,
      isPriceFixed,
    },
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    homeVisitCharge,
  });

  // Send booking confirmation email
  if (customer.email) {
    sendBookingConfirmationEmail(customer.email, booking, customer.name).catch(console.error);
  }

  // Notify admin via push notification
  const admin = await Admin.findOne();
  if (admin?.fcmToken) {
    sendAdminNotification(admin.fcmToken, booking).catch(console.error);
  }

  // Emit socket event for real-time admin notification
  const io = req.app.get("io");
  if (io) {
    io.emit("new_booking", {
      bookingId: booking.bookingId,
      customerName: customer.name,
      serviceName: service.name,
      createdAt: booking.createdAt,
    });
  }

  res.status(201).json({
    success: true,
    message: "Booking created successfully",
    booking,
    homeVisitCharge,
    distanceKm: parseFloat(distanceKm.toFixed(2)),
  });
};

/**
 * @route   GET /api/admin/bookings
 * @desc    Get all bookings (admin)
 * @access  Private (Admin)
 */
exports.getAllBookings = async (req, res) => {
  const { status, page = 1, limit = 20, search } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { bookingId: { $regex: search, $options: "i" } },
      { "customerSnapshot.name": { $regex: search, $options: "i" } },
      { "customerSnapshot.mobile": { $regex: search, $options: "i" } },
    ];
  }

  const total = await Booking.countDocuments(filter);
  const bookings = await Booking.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({
    success: true,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    bookings,
  });
};

/**
 * @route   GET /api/admin/bookings/:id
 * @desc    Get single booking
 * @access  Private (Admin)
 */
exports.getBookingById = async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("customer", "name mobile email address");
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
  res.json({ success: true, booking });
};

/**
 * @route   PUT /api/admin/bookings/:id/status
 * @desc    Update booking status (accept/reject/dispatch/complete)
 * @access  Private (Admin)
 */
exports.updateBookingStatus = async (req, res) => {
  const { status, rejectionReason, rejectionType, adminNotes, employeeId } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

  const validTransitions = {
    pending: ["accepted", "rejected"],
    accepted: ["dispatched", "rejected"],
    dispatched: ["completed"],
  };

  if (!validTransitions[booking.status]?.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot change status from '${booking.status}' to '${status}'`,
    });
  }

  if (status === "rejected" && !rejectionReason) {
    return res.status(400).json({ success: false, message: "Rejection reason is required" });
  }

  if (status === "dispatched" && !employeeId) {
    return res.status(400).json({ success: false, message: "Please select an employee to dispatch" });
  }

  const { scheduledDate, totalAmount } = req.body;

  booking.status = status;
  if (adminNotes)    booking.adminNotes = adminNotes;
  if (scheduledDate) booking.scheduledDate = new Date(scheduledDate);
  if (totalAmount)   booking.totalAmount = Number(totalAmount);

  const now = new Date();
  if (status === "accepted") {
    booking.acceptedAt = now;
    if (scheduledDate) booking.scheduledDate = new Date(scheduledDate);
  }
  if (status === "rejected") {
    booking.rejectedAt = now;
    booking.rejectionReason = rejectionReason;
    booking.rejectionType = rejectionType || "custom";
  }
  if (status === "dispatched") {
    booking.dispatchedAt = now;

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    if (!employee.isActive) return res.status(400).json({ success: false, message: "This employee is inactive" });

    booking.assignedEmployee = employee._id;
    booking.employeeSnapshot = {
      name: employee.name,
      mobile: employee.mobile,
      designation: employee.designation,
      profileImage: employee.profileImage,
      employeeIdCode: employee.employeeIdCode,
    };
    booking.assignedAt = now;

    employee.totalAssigned = (employee.totalAssigned || 0) + 1;
    await employee.save();
  }
  if (status === "completed") {
    booking.completedAt = now;
    if (totalAmount) booking.totalAmount = Number(totalAmount);

    if (booking.assignedEmployee) {
      await Employee.findByIdAndUpdate(booking.assignedEmployee, { $inc: { totalCompleted: 1 } });
    }
  }

  await booking.save();

  // Emit real-time socket event to customer's room
  const io = req.app.get("io");
  if (io) {
    io.to(`customer_${booking.customer.toString()}`).emit("booking_status_update", {
      bookingId: booking.bookingId,
      status: booking.status,
      rejectionReason: booking.rejectionReason || null,
    });
  }

  // Notify customer
  const customer = await Customer.findById(booking.customer);
  if (customer?.fcmToken) {
    const messages = {
      accepted: { title: "Booking Accepted ✅", body: `Your booking #${booking.bookingId} has been accepted!` },
      rejected: { title: "Booking Rejected ❌", body: `Your booking #${booking.bookingId} was rejected: ${rejectionReason}` },
      dispatched: { title: "Technician Dispatched 🔧", body: `Our technician is on the way for booking #${booking.bookingId}` },
      completed: { title: "Booking Completed ✅", body: `Booking #${booking.bookingId} has been completed. Thank you!` },
    };
    const msg = messages[status];
    if (msg) {
      sendCustomerNotification(customer.fcmToken, msg.title, msg.body, { bookingId: booking.bookingId }).catch(console.error);
    }
  }

  res.json({ success: true, booking });
};

/**
 * @route   GET /api/customer/bookings
 * @desc    Get customer's own bookings
 * @access  Private (Customer)
 */
exports.getCustomerBookings = async (req, res) => {
  const bookings = await Booking.find({ customer: req.customer._id }).sort({ createdAt: -1 });
  res.json({ success: true, bookings });
};

/**
 * @route   GET /api/admin/bookings/stats
 * @desc    Dashboard stats - bookings per day/week/month
 * @access  Private (Admin)
 */
exports.getBookingStats = async (req, res) => {
  const now = new Date();
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const last6Months  = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    todayCount, weekCount, monthCount, totalCount,
    statusBreakdown, monthlyTrend,
    revenueStats, topServices, ratingStats, cancelledCount
  ] = await Promise.all([
    Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
    Booking.countDocuments({ createdAt: { $gte: startOfWeek } }),
    Booking.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Booking.countDocuments(),
    Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    // Monthly trend last 6 months
    Booking.aggregate([
      { $match: { createdAt: { $gte: last6Months } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 }, revenue: { $sum: { $ifNull: ["$totalAmount", 0] } } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    // Revenue stats
    Booking.aggregate([
      { $match: { status: "completed", totalAmount: { $exists: true, $gt: 0 } } },
      { $group: {
        _id: null,
        total:     { $sum: "$totalAmount" },
        thisMonth: { $sum: { $cond: [{ $gte: ["$completedAt", startOfMonth] }, "$totalAmount", 0] } },
        today:     { $sum: { $cond: [{ $gte: ["$completedAt", startOfDay] }, "$totalAmount", 0] } },
        avgOrder:  { $avg: "$totalAmount" },
      }},
    ]),
    // Top services
    Booking.aggregate([
      { $group: { _id: "$service.serviceName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    // Rating stats
    Booking.aggregate([
      { $match: { rating: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
    Booking.countDocuments({ status: "cancelled" }),
  ]);

  res.json({
    success: true,
    stats: {
      today: todayCount, thisWeek: weekCount, thisMonth: monthCount, total: totalCount,
      statusBreakdown, monthlyTrend,
      cancelled: cancelledCount,
      revenue: revenueStats[0] || { total: 0, thisMonth: 0, today: 0, avgOrder: 0 },
      topServices,
      rating: ratingStats[0] || { avg: 0, count: 0 },
    },
  });
};

// Predefined rejection reasons
exports.getRejectionReasons = async (req, res) => {
  const reasons = [
    { id: 1, en: "Service area not covered", hi: "सेवा क्षेत्र उपलब्ध नहीं", hinglish: "Service area covered nahi hai" },
    { id: 2, en: "Technician not available", hi: "तकनीशियन उपलब्ध नहीं", hinglish: "Technician available nahi hai" },
    { id: 3, en: "Incorrect details provided", hi: "गलत जानकारी दी गई", hinglish: "Details sahi nahi hai" },
    { id: 4, en: "Service not provided for this appliance", hi: "इस उपकरण की सेवा नहीं दी जाती", hinglish: "Is appliance ki service nahi milti" },
    { id: 5, en: "Customer unreachable", hi: "ग्राहक से संपर्क नहीं हो पाया", hinglish: "Customer se contact nahi hua" },
  ];
  res.json({ success: true, reasons });
};

// @route   GET /api/customer/bookings/:id
// @desc    Get single booking detail for customer
exports.getCustomerBookingById = async (req, res) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    customer: req.customer._id,
  })
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' })
  res.json({ success: true, booking })
}

/**
 * @route   PUT /api/customer/bookings/:id/cancel
 * @desc    Customer cancels a booking (only pending/accepted)
 * @access  Private (Customer)
 */
exports.cancelBooking = async (req, res) => {
  const { cancelReason } = req.body;
  const booking = await Booking.findOne({ _id: req.params.id, customer: req.customer._id });
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

  if (!["pending", "accepted"].includes(booking.status)) {
    return res.status(400).json({ success: false, message: "Only pending or accepted bookings can be cancelled" });
  }

  booking.status      = "cancelled";
  booking.cancelledBy = "customer";
  booking.cancelReason= cancelReason || "Cancelled by customer";
  booking.cancelledAt = new Date();
  await booking.save();

  // Notify admin via socket
  const io = req.app.get("io");
  if (io) io.emit("booking_cancelled", { bookingId: booking.bookingId, customerName: booking.customerSnapshot?.name });

  res.json({ success: true, booking });
};

/**
 * @route   POST /api/customer/bookings/:id/rating
 * @desc    Customer rates a completed booking
 * @access  Private (Customer)
 */
exports.rateBooking = async (req, res) => {
  const { rating, review } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: "Rating must be 1-5" });
  }

  const booking = await Booking.findOne({ _id: req.params.id, customer: req.customer._id });
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
  if (booking.status !== "completed") return res.status(400).json({ success: false, message: "Only completed bookings can be rated" });
  if (booking.rating) return res.status(400).json({ success: false, message: "Already rated" });

  booking.rating  = rating;
  booking.review  = review || null;
  booking.ratedAt = new Date();
  await booking.save();

  res.json({ success: true, booking });
};

/**
 * @route   PUT /api/admin/bookings/:id/bill
 * @desc    Generate / update invoice for a booking (admin only)
 * @access  Private (Admin)
 */
exports.generateBill = async (req, res) => {
  const { billItems, discount, gstPercent, paymentStatus, paymentMethod } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

  if (!Array.isArray(billItems) || billItems.length === 0) {
    return res.status(400).json({ success: false, message: "At least one bill item is required" });
  }

  const subtotal = billItems.reduce((sum, item) => sum + (Number(item.amount) * (Number(item.quantity) || 1)), 0);
  const discountAmt = Number(discount) || 0;
  const afterDiscount = Math.max(0, subtotal - discountAmt);
  const gstPct = Number(gstPercent) || 0;
  const gstAmt = Math.round((afterDiscount * gstPct) / 100);
  const grandTotal = afterDiscount + gstAmt;

  booking.billItems    = billItems;
  booking.discount      = discountAmt;
  booking.gstPercent    = gstPct;
  booking.gstAmount     = gstAmt;
  booking.grandTotal    = grandTotal;
  booking.totalAmount   = grandTotal;   // keep in sync with existing field
  if (paymentStatus) booking.paymentStatus = paymentStatus;
  if (paymentMethod) booking.paymentMethod = paymentMethod;
  if (paymentStatus === "paid" && !booking.paidAt) booking.paidAt = new Date();
  if (!booking.billGeneratedAt) booking.billGeneratedAt = new Date();

  await booking.save();

  res.json({ success: true, booking });
};

/**
 * @route   PUT /api/admin/bookings/:id/payment
 * @desc    Update payment status only (e.g. mark as paid later)
 * @access  Private (Admin)
 */
exports.updatePaymentStatus = async (req, res) => {
  const { paymentStatus, paymentMethod } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

  if (paymentStatus) booking.paymentStatus = paymentStatus;
  if (paymentMethod) booking.paymentMethod = paymentMethod;
  if (paymentStatus === "paid" && !booking.paidAt) booking.paidAt = new Date();

  await booking.save();
  res.json({ success: true, booking });
};

/**
 * @route   GET /api/admin/bookings/billing-summary
 * @desc    Revenue summary — paid/unpaid totals, by date range
 * @access  Private (Admin)
 */
exports.getBillingSummary = async (req, res) => {
  const { from, to } = req.query;
  const match = { totalAmount: { $ne: null } };
  if (from || to) {
    match.completedAt = {};
    if (from) match.completedAt.$gte = new Date(from);
    if (to)   match.completedAt.$lte = new Date(to);
  }

  const bookings = await Booking.find(match).select("bookingId totalAmount grandTotal paymentStatus paymentMethod completedAt customerSnapshot.name");

  const totalRevenue = bookings.reduce((s, b) => s + (b.grandTotal || b.totalAmount || 0), 0);
  const paid    = bookings.filter(b => b.paymentStatus === "paid");
  const unpaid  = bookings.filter(b => b.paymentStatus !== "paid");
  const paidAmt   = paid.reduce((s, b) => s + (b.grandTotal || b.totalAmount || 0), 0);
  const unpaidAmt = unpaid.reduce((s, b) => s + (b.grandTotal || b.totalAmount || 0), 0);

  res.json({
    success: true,
    summary: {
      totalRevenue, paidAmount: paidAmt, unpaidAmount: unpaidAmt,
      totalBills: bookings.length, paidCount: paid.length, unpaidCount: unpaid.length,
    },
    bookings,
  });
};
