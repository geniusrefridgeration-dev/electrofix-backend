# ⚡ ElectroFix Backend API

Electric Appliance Repair Service - REST API

## 🛠️ Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (JSON Web Tokens)
- **Real-time:** Socket.IO
- **Storage:** Cloudinary
- **Notifications:** Firebase FCM
- **Email:** Nodemailer (Gmail SMTP)
- **SMS:** Fast2SMS

---

## 🚀 Setup & Installation

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Seed the database (creates admin + default config)
```bash
npm run seed
```

### 4. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

---

## 📁 Project Structure

```
electrofix-backend/
├── config/
│   └── db.js                    # MongoDB connection
├── controllers/
│   ├── adminAuthController.js   # Admin login & preferences
│   ├── customerAuthController.js# Register, Login, OTP
│   ├── customerController.js    # Admin manages customers
│   ├── serviceController.js     # Full service CRUD
│   ├── bookingController.js     # Booking management
│   └── homeVisitController.js   # Home visit charge config
├── middleware/
│   ├── auth.js                  # JWT protection
│   └── errorHandler.js          # Global error handler
├── models/
│   ├── Admin.js                 # Admin schema
│   ├── Customer.js              # Customer schema
│   ├── Service.js               # Service + Category + Problem
│   ├── Booking.js               # Booking schema
│   └── HomeVisitConfig.js       # Distance-based pricing
├── routes/
│   ├── adminRoutes.js           # /api/admin/*
│   └── customerRoutes.js        # /api/customer/*
├── utils/
│   ├── email.js                 # Nodemailer email sender
│   ├── sms.js                   # Fast2SMS OTP sender
│   ├── otp.js                   # OTP generator
│   ├── notification.js          # Firebase FCM
│   ├── distance.js              # Haversine distance calc
│   ├── cloudinary.js            # Image upload config
│   └── seed.js                  # Database seeder
├── .env.example
├── .gitignore
├── package.json
└── server.js                    # Main entry point
```

---

## 🔗 API Endpoints

### Admin Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/auth/login` | Admin login |
| GET | `/api/admin/auth/me` | Get admin profile |
| PUT | `/api/admin/auth/preferences` | Update language/theme |

### Admin - Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/services` | Get all services |
| POST | `/api/admin/services` | Create service |
| PUT | `/api/admin/services/:id` | Update service |
| DELETE | `/api/admin/services/:id` | Delete service |
| POST | `/api/admin/services/:id/categories` | Add category |
| PUT | `/api/admin/services/:id/categories/:catId` | Update category |
| DELETE | `/api/admin/services/:id/categories/:catId` | Delete category |
| POST | `/api/admin/services/:id/categories/:catId/problems` | Add problem to category |
| POST | `/api/admin/services/:id/problems` | Add direct problem |

### Admin - Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/bookings` | Get all bookings |
| GET | `/api/admin/bookings/stats` | Dashboard stats |
| GET | `/api/admin/bookings/:id` | Get single booking |
| PUT | `/api/admin/bookings/:id/status` | Update booking status |
| GET | `/api/admin/bookings/rejection-reasons` | Predefined rejection reasons |

### Admin - Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/customers` | Get all customers |
| GET | `/api/admin/customers/:id` | Get customer + bookings |
| PUT | `/api/admin/customers/:id/toggle-status` | Activate/deactivate |
| DELETE | `/api/admin/customers/:id` | Delete customer |

### Customer Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/customer/auth/register` | Register |
| POST | `/api/customer/auth/login` | Login (sends OTP) |
| POST | `/api/customer/auth/verify-otp` | Verify OTP |
| POST | `/api/customer/auth/resend-otp` | Resend OTP |
| GET | `/api/customer/auth/me` | Get profile |
| PUT | `/api/customer/auth/profile` | Update profile |

### Customer - Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/customer/bookings` | Create booking |
| GET | `/api/customer/bookings` | My bookings |

---

## 🔄 Booking Status Flow

```
pending → accepted → dispatched → completed
pending → rejected
accepted → rejected
```

## 🔔 Real-time (Socket.IO)

Event emitted when new booking is created:
```json
{
  "event": "new_booking",
  "data": {
    "bookingId": "EF000001",
    "customerName": "Ramesh Kumar",
    "serviceName": "Washing Machine",
    "createdAt": "2024-01-01T10:00:00.000Z"
  }
}
```

---

## 📝 Default Admin Credentials
```
Email:    admin@electrofix.com
Password: Admin@123
```
*(Set in .env file)*

---

## ⚠️ Environment Variables Required

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |
| `EMAIL_USER` | Gmail address for sending OTP |
| `EMAIL_PASS` | Gmail app password |
| `FAST2SMS_API_KEY` | Fast2SMS API key for SMS OTP |
| `CLOUDINARY_*` | Cloudinary credentials for images |
| `FIREBASE_*` | Firebase credentials for push notifications |
| `SHOP_LAT` | Shop latitude (for distance calculation) |
| `SHOP_LNG` | Shop longitude (for distance calculation) |
