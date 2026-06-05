const HomeVisitConfig = require("../models/HomeVisitConfig");

/**
 * Haversine distance in km between two lat/lng points
 */
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Get home visit charge for given distance
 */
exports.getHomeVisitCharge = async (distanceKm) => {
  try {
    const config = await HomeVisitConfig.findOne({ isActive: true });
    if (!config) return 0;
    const slab = config.slabs.find(s => distanceKm >= s.minKm && distanceKm <= s.maxKm);
    return slab ? slab.charge : config.defaultCharge;
  } catch { return 0; }
};

/**
 * Get shop coordinates from DB (falls back to env)
 */
exports.getShopCoords = async () => {
  try {
    const config = await HomeVisitConfig.findOne({ isActive: true });
    if (config?.shopLat && config?.shopLng) {
      return { lat: config.shopLat, lng: config.shopLng };
    }
  } catch {}
  // fallback to env
  return {
    lat: parseFloat(process.env.SHOP_LAT || "23.2599"),
    lng: parseFloat(process.env.SHOP_LNG || "77.4126"),
  };
};
