const express = require("express");
const router = express.Router();
const { protectAdmin } = require("../middleware/auth");
const { upload } = require("../utils/cloudinary");

const adminAuth     = require("../controllers/adminAuthController");
const serviceCtrl   = require("../controllers/serviceController");
const bookingCtrl   = require("../controllers/bookingController");
const customerCtrl  = require("../controllers/customerController");
const homeVisitCtrl = require("../controllers/homeVisitController");

// AUTH
router.post("/auth/login",        adminAuth.adminLogin);
router.get ("/auth/me",           protectAdmin, adminAuth.getAdminProfile);
router.put ("/auth/preferences",  protectAdmin, adminAuth.updatePreferences);

// SERVICES
router.get   ("/services",          protectAdmin, serviceCtrl.getAllServices);
router.get   ("/services/:id",      protectAdmin, serviceCtrl.getServiceById);
router.post  ("/services",          protectAdmin, upload.single("image"), serviceCtrl.createService);
router.put   ("/services/:id",      protectAdmin, upload.single("image"), serviceCtrl.updateService);
router.delete("/services/:id",      protectAdmin, serviceCtrl.deleteService);

// Categories
router.post  ("/services/:id/categories",               protectAdmin, upload.single("image"), serviceCtrl.addCategory);
router.put   ("/services/:id/categories/:catId",        protectAdmin, upload.single("image"), serviceCtrl.updateCategory);
router.delete("/services/:id/categories/:catId",        protectAdmin, serviceCtrl.deleteCategory);

// Problems (in category)
router.post  ("/services/:id/categories/:catId/problems",              protectAdmin, serviceCtrl.addProblemToCategory);
router.put   ("/services/:id/categories/:catId/problems/:probId",      protectAdmin, serviceCtrl.updateProblemInCategory);
router.delete("/services/:id/categories/:catId/problems/:probId",      protectAdmin, serviceCtrl.deleteProblemFromCategory);

// Problems (direct on service)
router.post  ("/services/:id/problems",         protectAdmin, serviceCtrl.addProblemToService);
router.put   ("/services/:id/problems/:probId", protectAdmin, serviceCtrl.updateProblemInService);
router.delete("/services/:id/problems/:probId", protectAdmin, serviceCtrl.deleteProblemFromService);

// BOOKINGS
router.get("/bookings/stats",              protectAdmin, bookingCtrl.getBookingStats);
router.get("/bookings/rejection-reasons",  protectAdmin, bookingCtrl.getRejectionReasons);
router.get("/bookings",                    protectAdmin, bookingCtrl.getAllBookings);
router.get("/bookings/:id",                protectAdmin, bookingCtrl.getBookingById);
router.put("/bookings/:id/status",         protectAdmin, bookingCtrl.updateBookingStatus);

// CUSTOMERS
router.get   ("/customers",                 protectAdmin, customerCtrl.getAllCustomers);
router.get   ("/customers/:id",             protectAdmin, customerCtrl.getCustomerById);
router.put   ("/customers/:id/toggle-status", protectAdmin, customerCtrl.toggleCustomerStatus);
router.delete("/customers/:id",             protectAdmin, customerCtrl.deleteCustomer);

// HOME VISIT CONFIG + SHOP LOCATION
router.get("/home-visit-config",  protectAdmin, homeVisitCtrl.getConfig);
router.put("/home-visit-config",  protectAdmin, homeVisitCtrl.updateConfig);
router.get("/shop-location",      protectAdmin, homeVisitCtrl.getShopLocation);
router.put("/shop-location",      protectAdmin, homeVisitCtrl.updateShopLocation);

module.exports = router;
