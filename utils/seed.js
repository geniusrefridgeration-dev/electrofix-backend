require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const HomeVisitConfig = require("../models/HomeVisitConfig");
const connectDB = require("../config/db");

const seed = async () => {
  await connectDB();
  console.log("🌱 Seeding database...");

  // Create admin with predefined credentials
  const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
  if (!existingAdmin) {
    await Admin.create({
      name: process.env.ADMIN_NAME || "ElectroFix Admin",
      email: process.env.ADMIN_EMAIL || "admin@electrofix.com",
      password: process.env.ADMIN_PASSWORD || "Admin@123",
    });
    console.log("✅ Admin created");
    console.log(`   Email: ${process.env.ADMIN_EMAIL || "admin@electrofix.com"}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || "Admin@123"}`);
  } else {
    console.log("ℹ️  Admin already exists");
  }

  // Create default home visit config
  const existingConfig = await HomeVisitConfig.findOne();
  if (!existingConfig) {
    await HomeVisitConfig.create({
      slabs: [
        { minKm: 0, maxKm: 5, charge: 200, label: "Within 5 km" },
        { minKm: 5, maxKm: 10, charge: 300, label: "5-10 km" },
        { minKm: 10, maxKm: 20, charge: 400, label: "10-20 km" },
      ],
      defaultCharge: 500,
    });
    console.log("✅ Default home visit config created");
  } else {
    console.log("ℹ️  Home visit config already exists");
  }

  console.log("✅ Seeding complete!");
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
