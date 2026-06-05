require("dotenv").config();
require("express-async-errors");

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const adminRoutes = require("./routes/adminRoutes");
const customerRoutes = require("./routes/customerRoutes");

const app = express();
const server = http.createServer(app);

// ========================
// SOCKET.IO SETUP
// ========================
const io = new Server(server, {
  cors: {
    origin: "*",  // Allow all origins including mobile app
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Customer joins their personal room to receive booking updates
  socket.on("join_customer", (customerId) => {
    socket.join(`customer_${customerId}`);
    console.log(`👤 Customer ${customerId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ========================
// MIDDLEWARE
// ========================
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        process.env.ADMIN_URL,
        process.env.CUSTOMER_WEBSITE_URL,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:19006",
        "http://localhost:8081",
      ].filter(Boolean)

      const isLocalIP = origin && /^http:\/\/192\.168\.\d+\.\d+/.test(origin)
      const isMobileApp = !origin  // React Native has no origin

      if (isMobileApp || isLocalIP || allowed.includes(origin)) {
        callback(null, true)
      } else if (process.env.NODE_ENV !== 'production') {
        callback(null, true)  // Allow all in development
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: "Too many requests. Please try again later." },
});
app.use("/api/", limiter);

// Auth routes stricter limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many login attempts. Try after 15 minutes." },
});
app.use("/api/customer/auth/", authLimiter);
app.use("/api/admin/auth/", authLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ========================
// HEALTH CHECK
// ========================
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "ElectroFix API",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + "s",
  });
});

// ========================
// ROUTES
// ========================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "⚡ ElectroFix API is running",
    version: "1.0.0",
    endpoints: {
      admin: "/api/admin",
      customer: "/api/customer",
    },
  });
});

app.use("/api/admin", adminRoutes);
app.use("/api/customer", customerRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log("\n⚡ ================================");
    console.log(`⚡  ElectroFix Backend`);
    console.log(`⚡  Port: ${PORT}`);
    console.log(`⚡  Mode: ${process.env.NODE_ENV || "development"}`);
    console.log("⚡ ================================\n");
  });
};

startServer();

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});
