const Employee = require("../models/Employee");
const Booking  = require("../models/Booking");

/**
 * @route   GET /api/admin/employees
 * @desc    List all employees
 * @access  Private (Admin)
 */
exports.getEmployees = async (req, res) => {
  const { active } = req.query;
  const filter = {};
  if (active === "true") filter.isActive = true;
  if (active === "false") filter.isActive = false;

  const employees = await Employee.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, employees });
};

/**
 * @route   GET /api/admin/employees/:id
 * @desc    Get single employee with recent booking history
 * @access  Private (Admin)
 */
exports.getEmployeeById = async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

  const bookings = await Booking.find({ assignedEmployee: employee._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("bookingId status service.serviceName service.problemName createdAt completedAt rating totalAmount");

  res.json({ success: true, employee, recentBookings: bookings });
};

/**
 * @route   POST /api/admin/employees
 * @desc    Create new employee
 * @access  Private (Admin)
 */
exports.createEmployee = async (req, res) => {
  const { name, mobile, email, designation, specialization, address, aadharNumber, notes } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ success: false, message: "Name and mobile are required" });
  }

  const existing = await Employee.findOne({ mobile });
  if (existing) return res.status(400).json({ success: false, message: "Mobile number already registered" });

  const count = await Employee.countDocuments();
  const employeeIdCode = `EF-TECH-${String(count + 1).padStart(3, "0")}`;

  const employee = await Employee.create({
    name, mobile, email, designation, specialization, address, aadharNumber, notes,
    employeeIdCode,
  });

  res.status(201).json({ success: true, employee });
};

/**
 * @route   PUT /api/admin/employees/:id
 * @desc    Update employee details
 * @access  Private (Admin)
 */
exports.updateEmployee = async (req, res) => {
  const updates = { ...req.body };
  delete updates.employeeIdCode;
  delete updates.totalAssigned;
  delete updates.totalCompleted;
  delete updates.avgRating;

  const employee = await Employee.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

  res.json({ success: true, employee });
};

/**
 * @route   PUT /api/admin/employees/:id/toggle-active
 * @desc    Activate/deactivate employee
 * @access  Private (Admin)
 */
exports.toggleEmployeeActive = async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

  employee.isActive = !employee.isActive;
  await employee.save();

  res.json({ success: true, employee });
};

/**
 * @route   POST /api/admin/employees/:id/image
 * @desc    Upload employee profile photo
 * @access  Private (Admin)
 */
exports.uploadEmployeeImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });

  const employee = await Employee.findByIdAndUpdate(
    req.params.id,
    { profileImage: req.file.path },
    { new: true }
  );
  if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

  res.json({ success: true, profileImage: employee.profileImage, employee });
};

/**
 * @route   DELETE /api/admin/employees/:id
 * @desc    Delete employee (only if no active dispatched booking)
 * @access  Private (Admin)
 */
exports.deleteEmployee = async (req, res) => {
  const activeBooking = await Booking.findOne({
    assignedEmployee: req.params.id,
    status: "dispatched",
  });
  if (activeBooking) {
    return res.status(400).json({ success: false, message: "Cannot delete — employee has an active dispatched booking" });
  }

  const employee = await Employee.findByIdAndDelete(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

  res.json({ success: true, message: "Employee deleted" });
};
