const HomeVisitConfig = require("../models/HomeVisitConfig");

// Get or create default config
const getOrCreate = async () => {
  let config = await HomeVisitConfig.findOne({ isActive: true });
  if (!config) {
    config = await HomeVisitConfig.create({
      slabs: [
        { minKm: 0,  maxKm: 5,  charge: 200, label: "Within 5 km" },
        { minKm: 5,  maxKm: 10, charge: 300, label: "5–10 km" },
        { minKm: 10, maxKm: 20, charge: 400, label: "10–20 km" },
      ],
      defaultCharge: 500,
    });
  }
  return config;
};

/**
 * GET /api/admin/home-visit-config
 * GET /api/customer/home-visit-config
 */
exports.getConfig = async (req, res) => {
  const config = await getOrCreate();
  res.json({ success: true, config });
};

/**
 * PUT /api/admin/home-visit-config
 * Update slabs + defaultCharge
 */
exports.updateConfig = async (req, res) => {
  const { slabs, defaultCharge } = req.body;
  const config = await getOrCreate();
  if (slabs !== undefined) config.slabs = slabs;
  if (defaultCharge !== undefined) config.defaultCharge = defaultCharge;
  await config.save();
  res.json({ success: true, config });
};

/**
 * GET /api/admin/shop-location
 * Return current saved shop lat/lng
 */
exports.getShopLocation = async (req, res) => {
  const config = await getOrCreate();
  res.json({ success: true, lat: config.shopLat, lng: config.shopLng });
};

/**
 * PUT /api/admin/shop-location
 * Admin sets exact shop location from map
 */
exports.updateShopLocation = async (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ success: false, message: "lat and lng required" });
  const config = await getOrCreate();
  config.shopLat = parseFloat(lat);
  config.shopLng = parseFloat(lng);
  await config.save();
  res.json({ success: true, lat: config.shopLat, lng: config.shopLng });
};
