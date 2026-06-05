const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const { generateOTP, getOTPExpiry } = require("../utils/otp");
const { sendOTPEmail } = require("../utils/email");
const { sendOTPSMS } = require("../utils/sms");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

/**
 * @route   POST /api/customer/auth/register
 * @desc    Register new customer
 * @access  Public
 */
exports.register = async (req, res) => {
  const { name, mobile, email, password, address, location } = req.body;

  if (!name || !mobile || !password || !address) {
    return res.status(400).json({ success: false, message: "Name, mobile, password and address are required" });
  }

  const existingMobile = await Customer.findOne({ mobile });
  if (existingMobile) {
    return res.status(400).json({ success: false, message: "Mobile number already registered" });
  }

  const customerData = { name, mobile, password, address };
  if (email) customerData.email = email;
  if (location?.coordinates) customerData.location = location;

  const customer = await Customer.create(customerData);

  // Send OTP for verification
  const otp = generateOTP();
  const expiresAt = getOTPExpiry();

  customer.otp = { code: otp, expiresAt };
  await customer.save();

  // Send OTP via email if provided, otherwise SMS
  if (email) {
    sendOTPEmail(email, otp, name).catch(console.error);
  } else {
    sendOTPSMS(mobile, otp).catch(console.error);
  }

  // In development, show OTP in response
  const responseData = {
    success: true,
    message: email
      ? `OTP sent to ${email}`
      : `OTP sent to ${mobile}`,
    customerId: customer._id,
  };

  if (process.env.NODE_ENV === "production") {
    responseData.devOTP = otp;
  }

  res.status(201).json(responseData);
};

/**
 * @route   POST /api/customer/auth/login
 * @desc    Login with mobile + password, then OTP verification
 * @access  Public
 */
exports.login = async (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return res.status(400).json({ success: false, message: "Mobile and password are required" });
  }

  const customer = await Customer.findOne({ mobile }).select("+password");
  if (!customer) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const isMatch = await customer.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  if (!customer.isActive) {
    return res.status(403).json({ success: false, message: "Account deactivated. Contact support." });
  }

  // Generate OTP
  const otp = generateOTP();
  customer.otp = { code: otp, expiresAt: getOTPExpiry() };
  await customer.save();

  if (customer.email) {
    sendOTPEmail(customer.email, otp, customer.name).catch(console.error);
  } else {
    sendOTPSMS(mobile, otp).catch(console.error);
  }

  const responseData = {
    success: true,
    message: customer.email
      ? `OTP sent to ${customer.email}`
      : `OTP sent to ${mobile}`,
    customerId: customer._id,
    hasEmail: !!customer.email,
  };

  if (process.env.NODE_ENV === "development") {
    responseData.devOTP = otp;
  }

  res.json(responseData);
};

/**
 * @route   POST /api/customer/auth/verify-otp
 * @desc    Verify OTP and complete login
 * @access  Public
 */
exports.verifyOTP = async (req, res) => {
  const { customerId, otp } = req.body;

  if (!customerId || !otp) {
    return res.status(400).json({ success: false, message: "Customer ID and OTP are required" });
  }

  const customer = await Customer.findById(customerId);
  if (!customer) {
    return res.status(404).json({ success: false, message: "Customer not found" });
  }

  if (!customer.otp?.code || customer.otp.code !== otp) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  if (new Date() > customer.otp.expiresAt) {
    return res.status(400).json({ success: false, message: "OTP expired. Please login again." });
  }

  // Clear OTP after successful verification
  customer.otp = { code: null, expiresAt: null };
  await customer.save();

  const token = generateToken(customer._id, "customer");

  res.json({
    success: true,
    token,
    customer: {
      _id: customer._id,
      id: customer._id,
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      address: customer.address,
      location: customer.location,
      preferredLanguage: customer.preferredLanguage,
      profileImage: customer.profileImage || null,
    },
  });
};

/**
 * @route   POST /api/customer/auth/resend-otp
 * @desc    Resend OTP
 * @access  Public
 */
exports.resendOTP = async (req, res) => {
  const { customerId } = req.body;

  const customer = await Customer.findById(customerId);
  if (!customer) {
    return res.status(404).json({ success: false, message: "Customer not found" });
  }

  const otp = generateOTP();
  customer.otp = { code: otp, expiresAt: getOTPExpiry() };
  await customer.save();

  if (customer.email) {
    sendOTPEmail(customer.email, otp, customer.name).catch(console.error);
  } else {
    sendOTPSMS(customer.mobile, otp).catch(console.error);
  }

  const responseData = { success: true, message: "OTP resent successfully" };
  if (process.env.NODE_ENV === "production") responseData.devOTP = otp;

  res.json(responseData);
};

/**
 * @route   GET /api/customer/auth/me
 * @desc    Get current customer profile
 * @access  Private (Customer)
 */
exports.getProfile = async (req, res) => {
  res.json({ success: true, customer: req.customer });
};

/**
 * @route   PUT /api/customer/auth/profile
 * @desc    Update customer profile
 * @access  Private (Customer)
 */
exports.updateProfile = async (req, res) => {
  const { name, email, address, location, fcmToken, preferredLanguage } = req.body;

  const updates = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  if (address) updates.address = address;
  if (location) updates.location = location;
  if (fcmToken) updates.fcmToken = fcmToken;
  if (preferredLanguage) updates.preferredLanguage = preferredLanguage;

  const customer = await Customer.findByIdAndUpdate(req.customer._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, customer });
};

/**
 * @route   POST /api/customer/auth/profile/image
 * @desc    Upload customer profile image
 * @access  Private (Customer)
 */
exports.uploadProfileImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' })
  const customer = await Customer.findByIdAndUpdate(
    req.customer._id,
    { profileImage: req.file.path },
    { new: true }
  )
  res.json({ success: true, profileImage: customer.profileImage, customer })
}

/**
 * @route   POST /api/customer/auth/forgot-password
 * @desc    Send OTP to mobile for password reset
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
  const { mobile } = req.body;
  const customer = await Customer.findOne({ mobile });
  if (!customer) return res.status(404).json({ success: false, message: "Mobile number not registered" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  customer.resetOtp = { code: otp, expiresAt };
  await customer.save();

  // Send OTP via SMS
  try { await sendOTP(mobile, otp) } catch {}

  res.json({
    success: true,
    customerId: customer._id,
    message: `Reset OTP sent to ${mobile}`,
    ...(process.env.NODE_ENV === "development" ? { devOTP: otp } : {}),
  });
};

/**
 * @route   POST /api/customer/auth/reset-password
 * @desc    Verify OTP and reset password
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
  const { customerId, otp, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }

  const customer = await Customer.findById(customerId).select("+password +resetOtp");
  if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
  if (!customer.resetOtp?.code) return res.status(400).json({ success: false, message: "No OTP requested" });
  if (new Date() > customer.resetOtp.expiresAt) return res.status(400).json({ success: false, message: "OTP expired" });
  if (customer.resetOtp.code !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });

  customer.password = newPassword;
  customer.resetOtp = { code: null, expiresAt: null };
  await customer.save();

  res.json({ success: true, message: "Password reset successfully! Please login." });
};
