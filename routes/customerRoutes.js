const express = require("express");
const router = express.Router();
const { protectCustomer } = require("../middleware/auth");

// Controllers
const customerAuth = require("../controllers/customerAuthController");
const { upload } = require("../utils/cloudinary");
const serviceCtrl = require("../controllers/serviceController");
const bookingCtrl = require("../controllers/bookingController");
const homeVisitCtrl = require("../controllers/homeVisitController");

// =====================
// AUTH ROUTES
// =====================
router.post("/auth/register", customerAuth.register);
router.post("/auth/login", customerAuth.login);
router.post("/auth/verify-otp", customerAuth.verifyOTP);
router.post("/auth/resend-otp", customerAuth.resendOTP);
router.get("/auth/me", protectCustomer, customerAuth.getProfile);
router.put("/auth/profile", protectCustomer, customerAuth.updateProfile);
router.post("/auth/profile/image", protectCustomer, upload.single("image"), customerAuth.uploadProfileImage);
router.post("/auth/forgot-password", customerAuth.forgotPassword);
router.post("/auth/reset-password",  customerAuth.resetPassword);

// =====================
// SERVICE ROUTES (Public - no auth needed)
// =====================
router.get("/services", serviceCtrl.getAllServices);
router.get("/services/:id", serviceCtrl.getServiceById);

// =====================
// BOOKING ROUTES
// =====================
router.post("/bookings", protectCustomer, bookingCtrl.createBooking);
router.get("/bookings", protectCustomer, bookingCtrl.getCustomerBookings);
router.get("/bookings/:id", protectCustomer, bookingCtrl.getCustomerBookingById);

// =====================
// HOME VISIT CONFIG (Public)
// =====================
router.get("/home-visit-config", homeVisitCtrl.getConfig);

module.exports = router;
