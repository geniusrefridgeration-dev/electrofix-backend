const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ADMIN_EXPIRE || "1d",
  });
};

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login with predefined credentials
 * @access  Public
 */
exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const admin = await Admin.findOne({ email }).select("+password");
  if (!admin) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const token = generateToken(admin._id, "admin");

  res.json({
    success: true,
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      preferredLanguage: admin.preferredLanguage,
      preferredTheme: admin.preferredTheme,
    },
  });
};

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current admin profile
 * @access  Private (Admin)
 */
exports.getAdminProfile = async (req, res) => {
  res.json({ success: true, admin: req.admin });
};

/**
 * @route   PUT /api/admin/auth/preferences
 * @desc    Update admin language/theme preferences
 * @access  Private (Admin)
 */
exports.updatePreferences = async (req, res) => {
  const { preferredLanguage, preferredTheme, fcmToken } = req.body;

  const updates = {};
  if (preferredLanguage) updates.preferredLanguage = preferredLanguage;
  if (preferredTheme) updates.preferredTheme = preferredTheme;
  if (fcmToken) updates.fcmToken = fcmToken;

  const admin = await Admin.findByIdAndUpdate(req.admin._id, updates, { new: true });
  res.json({ success: true, admin });
};
