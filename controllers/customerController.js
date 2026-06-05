const Customer = require("../models/Customer");
const Booking = require("../models/Booking");

/**
 * @route   GET /api/admin/customers
 * @desc    Get all customers (with search & pagination)
 * @access  Private (Admin)
 */
exports.getAllCustomers = async (req, res) => {
  const { page = 1, limit = 20, search, isActive } = req.query;

  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { mobile: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const total = await Customer.countDocuments(filter);
  const customers = await Customer.find(filter)
    .select("-otp")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({
    success: true,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    customers,
  });
};

/**
 * @route   GET /api/admin/customers/:id
 * @desc    Get single customer with booking history
 * @access  Private (Admin)
 */
exports.getCustomerById = async (req, res) => {
  const customer = await Customer.findById(req.params.id).select("-otp");
  if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

  const bookings = await Booking.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(10);

  res.json({ success: true, customer, bookings });
};

/**
 * @route   PUT /api/admin/customers/:id/toggle-status
 * @desc    Activate/deactivate customer
 * @access  Private (Admin)
 */
exports.toggleCustomerStatus = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

  customer.isActive = !customer.isActive;
  await customer.save();

  res.json({
    success: true,
    message: `Customer ${customer.isActive ? "activated" : "deactivated"} successfully`,
    isActive: customer.isActive,
  });
};

/**
 * @route   DELETE /api/admin/customers/:id
 * @desc    Delete customer
 * @access  Private (Admin)
 */
exports.deleteCustomer = async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

  await customer.deleteOne();
  res.json({ success: true, message: "Customer deleted successfully" });
};
